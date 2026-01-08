import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { useQueryClient } from '@tanstack/react-query';
import { EVENT_TYPES } from './events';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useMovieDetail } from '@/components/movie/MovieDetailProvider';
import React from 'react';
import { useRuntimeConfig } from './runtime-config';
import { apiClient } from './api-client';

export function useUpdates() {
    const { mutate } = useSWRConfig();
    const queryClient = useQueryClient();
    const { openMovie } = useMovieDetail();
    const { basePath } = useRuntimeConfig();

    const { data: sessionData } = useSWR<{ code: string | null; userId: string }>('/api/session', (url: string) => apiClient.get(url).then(res => res.data));
    const sessionCode = sessionData?.code;

    useEffect(() => {
        if (!sessionCode) return;

        const eventSource = new EventSource(`${basePath}/api/events`);

        eventSource.addEventListener(EVENT_TYPES.SESSION_UPDATED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate session members
                mutate(['/api/session/members', sessionCode]);
                // Invalidate deck to get fresh cards for new member configuration
                queryClient.invalidateQueries({ queryKey: ['deck'] });
            }
        });

        eventSource.addEventListener(EVENT_TYPES.MATCH_FOUND, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate matches
                mutate(['/api/session/matches', sessionCode]);
                // Invalidate likes list
                queryClient.invalidateQueries({ queryKey: ['likes'] });

                // If it's not the current user who swiped, show a toast
                if (sessionData && data.swiperId !== sessionData.userId) {
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
        });

        eventSource.addEventListener(EVENT_TYPES.MATCH_REMOVED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate matches
                mutate(['/api/session/matches', sessionCode]);
                // Invalidate likes list
                queryClient.invalidateQueries({ queryKey: ['likes'] });
            }
        });

        eventSource.addEventListener(EVENT_TYPES.FILTERS_UPDATED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate session to get new filters
                mutate('/api/session');
                // Invalidate deck to get fresh cards with new filters
                queryClient.invalidateQueries({ queryKey: ['deck', sessionCode] });
                
                // Show toast if another member changed the filters
                if (sessionData && data.userId !== sessionData.userId) {
                    toast.info(`${data.userName} changed the filters`, {
                        description: "The cards have been updated.",
                        position: 'top-right'
                    });
                }
            }
        });

        eventSource.addEventListener(EVENT_TYPES.SETTINGS_UPDATED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate session to get new settings
                mutate('/api/session');
                
                // Show toast if another member changed the settings
                if (sessionData && data.userId !== sessionData.userId) {
                    toast.info(`${data.userName} updated session settings`, {
                        description: "Rules and limits might have changed.",
                        position: 'top-right'
                    });
                }
            }
        });

        eventSource.addEventListener(EVENT_TYPES.STATS_RESET, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate stats
                queryClient.invalidateQueries({ queryKey: ['session-stats'] });
                // Invalidate SWR stats cache
                mutate('/api/session/stats');
                // Invalidate matches
                mutate(['/api/session/matches', sessionCode]);
                // Invalidate deck to refresh swipes
                queryClient.invalidateQueries({ queryKey: ['deck', sessionCode] });
                
                // Show toast
                if (sessionData && data.userId !== sessionData.userId) {
                    toast.info(`${data.userName} reset session stats`, {
                        description: "All swipes and matches have been cleared.",
                        position: 'top-right'
                    });
                }
            }
        });

        eventSource.addEventListener(EVENT_TYPES.USER_JOINED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate session members
                mutate(['/api/session/members', sessionCode]);
                // Invalidate deck to get fresh cards for new member configuration
                queryClient.invalidateQueries({ queryKey: ['deck'] });
                
                // Show toast if another member joined
                if (sessionData && data.userId !== sessionData.userId) {
                    toast.info(`${data.userName} joined the session`, {
                        position: 'top-right'
                    });
                }
            }
        });

        eventSource.addEventListener(EVENT_TYPES.USER_LEFT, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate session members
                mutate(['/api/session/members', sessionCode]);
                // Invalidate matches
                mutate(['/api/session/matches', sessionCode]);
                // Invalidate deck to refresh swipes
                queryClient.invalidateQueries({ queryKey: ['deck'] });
                
                // Show toast
                if (sessionData && data.userId !== sessionData.userId) {
                    toast.info(`${data.userName} left the session`, {
                        position: 'top-right'
                    });
                }
            }
        });

        eventSource.addEventListener(EVENT_TYPES.LIKE_UPDATED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate likes list to update "liked by" avatars/counts
                queryClient.invalidateQueries({ queryKey: ['likes'] });
            }
        });

        return () => {
            eventSource.close();
        };
    }, [sessionCode, mutate, sessionData, queryClient, openMovie]);
}

export function useQuickConnectUpdates(qcSecret?: string | null, onAuthorized?: (data: any) => void) {
    useEffect(() => {
        if (!qcSecret) return;

        // Use polling instead of SSE for quick connect to avoid secret consumption issues
        // and because it's more reliable across different environments.
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

        // Initial poll
        poll();

        return () => {
            clearInterval(interval);
        };
    }, [qcSecret, onAuthorized]);
}
