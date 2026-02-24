import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EVENT_TYPES } from './events';
import { toast } from 'sonner';
import { useMovieDetail } from '@/components/movie/MovieDetailProvider';
import React from 'react';
import { useRuntimeConfig } from './runtime-config';
import { apiClient } from './api-client';
import { useSession, QUERY_KEYS, useLeaveSession } from '@/hooks/api';
import { usePathname, useRouter } from 'next/navigation';
import { logger } from './logger';

export function useUpdates() {
    const queryClient = useQueryClient();
    const { openMovie } = useMovieDetail();
    const { basePath } = useRuntimeConfig();
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';
    const { data: session, isError, error } = useSession({ enabled: !isLoginPage });
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

        const handleSessionUpdated = async (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // First refetch session to get updated data
                await queryClient.refetchQueries({ queryKey: QUERY_KEYS.session });
                // Refetch user settings to get any updated watch region
                await queryClient.refetchQueries({ queryKey: QUERY_KEYS.user.settings });
                
                // Then invalidate related queries
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
                queryClient.invalidateQueries({ queryKey: ["media", "watchProviders"] });
                queryClient.invalidateQueries({ queryKey: ["deck"] });
            }
        };

        const handleMatchFound = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
                if (data.itemId) {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, false) });
                }

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
                if (data.itemId) {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, false) });
                }
            }
        };

        const handleFiltersUpdated = async (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            logger.debug("[useUpdates] Filters updated event:", { 
                sessionCode: data.sessionCode, 
                currentSessionCode: sessionCode,
                updaterUserId: data.userId, 
                myUserId: userId,
                updaterUserName: data.userName
            });
            
            if (data.sessionCode === sessionCode) {
                // First refetch session to get new filters
                await queryClient.refetchQueries({ queryKey: QUERY_KEYS.session });
                // Then invalidate deck to trigger refetch with new filters
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
                queryClient.invalidateQueries({ queryKey: ["deck"] });
                
                // Show toast to everyone EXCEPT the user who made the change
                // Use String comparison to handle type differences
                const isDifferentUser = String(data.userId) !== String(userId);
                logger.debug("[useUpdates] Should show toast?", { isDifferentUser, userId, updaterId: data.userId });
                
                if (userId && isDifferentUser) {
                    toast.info(`${data.userName} changed the filters`, {
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
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
                queryClient.invalidateQueries({ queryKey: ["movie"] });
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
                if (data.itemId) {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, false) });
                }
            }
        };

        const handleAdminConfigUpdated = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            
            // Invalidate everything that could be affected by admin settings
            if (data.type === 'libraries') {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.libraries });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.libraries });
                queryClient.invalidateQueries({ queryKey: ["deck"] });
            } else if (data.type === 'filters') {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.genres });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.years });
                queryClient.invalidateQueries({ queryKey: ["media", "ratings"] });
                queryClient.invalidateQueries({ queryKey: ["deck"] });
            }

            if (userId && data.userId !== userId) {
                toast.info(`Admin updated ${data.type === 'libraries' ? 'libraries' : 'global settings'}`, {
                    description: "The application has been updated.",
                    position: 'top-right'
                });
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
        eventSource.addEventListener(EVENT_TYPES.ADMIN_CONFIG_UPDATED, handleAdminConfigUpdated as any);

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
                logger.error("Quick connect polling error:", err);
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
