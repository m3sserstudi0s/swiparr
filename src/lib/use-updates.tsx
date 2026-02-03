import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EVENT_TYPES } from './events';
import { toast } from 'sonner';
import { useMovieDetail } from '@/components/movie/MovieDetailProvider';
import React from 'react';
import { useRuntimeConfig } from './runtime-config';
import { apiClient } from './api-client';
import { useSession, QUERY_KEYS, useLeaveSession } from '@/hooks/api';
import { useRouter } from 'next/navigation';

export function useUpdates() {
    const queryClient = useQueryClient();
    const { openMovie } = useMovieDetail();
    const { basePath } = useRuntimeConfig();
    const { data: session, isError, error } = useSession();
    const router = useRouter();
    
    useEffect(() => {
        if (isError) {
            const errData = (error as any)?.response?.data;
            if (errData?.error === "guest_kicked") {
                toast.error("Session ended", {
                    description: "The host has disabled guest lending. You have been logged out.",
                    duration: 5000,
                });
                queryClient.setQueryData(QUERY_KEYS.session, null);
                router.push('/login');
            }
        }
    }, [isError, error, router, queryClient]);

    const sessionCode = session?.code;
    const userId = session?.userId;

    useEffect(() => {
        if (!sessionCode) return;

        const eventSource = new EventSource(`${basePath}/api/events`);

        const handleSessionUpdated = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
                queryClient.invalidateQueries({ queryKey: ["media", "watchProviders"] });
            }
        };

        const handleMatchFound = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });

                if (userId && data.swiperId !== userId) {
                    toast.success(<p>Match! <span className='font-semibold italic'>{data.itemName}</span></p>, {
                        description: "Check it out.",
                        action: {
                            label: "View",
                            onClick: () => openMovie(data.itemId)
                        },
                        position: 'top-right'
                    });
                }
            }
        };

        const handleMatchRemoved = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
            }
        };

        const handleFiltersUpdated = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
                
                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} ${data.isSettingsUpdate ? 'updated their streaming services' : 'changed the filters'}`, {
                        description: "The cards have been updated.",
                        position: 'top-right'
                    });
                }
            }
        };

        const handleSettingsUpdated = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
                
                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} updated session settings`, {
                        description: "Rules and limits might have changed.",
                        position: 'top-right'
                    });
                }
            }
        };

        const handleStatsReset = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
                
                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} reset session stats`, {
                        description: "All swipes and matches have been cleared.",
                        position: 'top-right'
                    });
                }
            }
        };

        const handleUserJoined = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
                queryClient.invalidateQueries({ queryKey: ["media", "watchProviders"] });
                
                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} joined the session`, {
                        position: 'top-right'
                    });
                }
            }
        };

        const handleUserLeft = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
                queryClient.invalidateQueries({ queryKey: ["media", "watchProviders"] });
                
                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} left the session`, {
                        position: 'top-right'
                    });
                }
            }
        };

        const handleLikeUpdated = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
            }
        };

        eventSource.addEventListener(EVENT_TYPES.SESSION_UPDATED, handleSessionUpdated as any);
        eventSource.addEventListener(EVENT_TYPES.MATCH_FOUND, handleMatchFound as any);
        eventSource.addEventListener(EVENT_TYPES.MATCH_REMOVED, handleMatchRemoved as any);
        eventSource.addEventListener(EVENT_TYPES.FILTERS_UPDATED, handleFiltersUpdated as any);
        eventSource.addEventListener(EVENT_TYPES.SETTINGS_UPDATED, handleSettingsUpdated as any);
        eventSource.addEventListener(EVENT_TYPES.STATS_RESET, handleStatsReset as any);
        eventSource.addEventListener(EVENT_TYPES.USER_JOINED, handleUserJoined as any);
        eventSource.addEventListener(EVENT_TYPES.USER_LEFT, handleUserLeft as any);
        eventSource.addEventListener(EVENT_TYPES.LIKE_UPDATED, handleLikeUpdated as any);

        return () => {
            eventSource.close();
        };
    }, [sessionCode, userId, queryClient, openMovie, basePath]);
}

export function useQuickConnectUpdates(qcSecret?: string | null, onAuthorized?: (data: any) => void) {
    useEffect(() => {
        if (!qcSecret) return;

        const poll = async () => {
            try {
                const res = await apiClient.post("/api/auth/quick-connect", { secret: qcSecret });
                const data = res.data;
                if (data.success) {
                    onAuthorized?.(data);
                    return true;
                }
            } catch (err) {
                console.error("Quick connect polling error:", err);
            }
            return false;
        };

        const interval = setInterval(async () => {
            const finished = await poll();
            if (finished) {
                clearInterval(interval);
            }
        }, 5000);

        poll();

        return () => {
            clearInterval(interval);
        };
    }, [qcSecret, onAuthorized]);
}
