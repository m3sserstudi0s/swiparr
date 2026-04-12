import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EVENT_TYPES } from './events';
import { toast } from 'sonner';
import { useMovieDetail } from '@/components/movie/MovieDetailProvider';
import React from 'react';
import { useRuntimeConfig } from './runtime-config';
import { apiClient } from './api-client';
import { useSession, QUERY_KEYS } from '@/hooks/api';
import { usePathname, useRouter } from 'next/navigation';
import { logger } from './logger';

const LEADER_CHANNEL = 'swiparr:sse-leader';
const LEADER_HEARTBEAT_MS = 3000;
const LEADER_TIMEOUT_MS = 9000;

export function useUpdates() {
    const queryClient = useQueryClient();
    const { openMovie } = useMovieDetail();
    const { basePath } = useRuntimeConfig();
    const pathname = usePathname();
    const isLoginPage = pathname === `${basePath}/login` || pathname === '/login';
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
                router.push(`${basePath}/login`);
            }
        }
    }, [isError, error, router, queryClient]);

    const sessionCode = session?.code;
    const userId = session?.userId;

    const invalidateSessionDeck = React.useCallback((code: string) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(code) });
    }, [queryClient]);

    useEffect(() => {
        if (!sessionCode || typeof window === 'undefined') return;

        const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const channel = new BroadcastChannel(LEADER_CHANNEL);
        let eventSource: EventSource | null = null;
        let isLeader = false;
        let leaderHeartbeat: number | null = null;
        let leadershipCheck: number | null = null;
        let lastLeaderSeenAt = 0;

        const closeEventSource = () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
        };

        const processEvent = async (eventType: string, payloadRaw: string) => {
            const data = JSON.parse(payloadRaw);

            if (eventType === EVENT_TYPES.SESSION_UPDATED && data.sessionCode === sessionCode) {
                await queryClient.refetchQueries({ queryKey: QUERY_KEYS.session });
                await queryClient.refetchQueries({ queryKey: QUERY_KEYS.user.settings });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(sessionCode) });
                invalidateSessionDeck(sessionCode);
                queryClient.invalidateQueries({ queryKey: ["media", "watchProviders"] });
                return;
            }

            if (eventType === EVENT_TYPES.MATCH_FOUND && data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
                if (data.itemId) {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, true) });
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
                return;
            }

            if (eventType === EVENT_TYPES.MATCH_REMOVED && data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
                if (data.itemId) {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, true) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, false) });
                }
                return;
            }

            if (eventType === EVENT_TYPES.FILTERS_UPDATED && data.sessionCode === sessionCode) {
                logger.debug("[useUpdates] Filters updated event:", {
                    sessionCode: data.sessionCode,
                    currentSessionCode: sessionCode,
                    updaterUserId: data.userId,
                    myUserId: userId,
                    updaterUserName: data.userName
                });

                await queryClient.refetchQueries({ queryKey: QUERY_KEYS.session });
                invalidateSessionDeck(sessionCode);

                const isDifferentUser = String(data.userId) !== String(userId);
                logger.debug("[useUpdates] Should show toast?", { isDifferentUser, userId, updaterId: data.userId });

                if (userId && isDifferentUser) {
                    toast.info(`${data.userName} changed the filters`, {
                        description: "The cards have been updated.",
                        position: 'top-right'
                    });
                }
                return;
            }

            if (eventType === EVENT_TYPES.SETTINGS_UPDATED && data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });

                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} updated session settings`, {
                        description: "Rules and limits might have changed.",
                        position: 'top-right'
                    });
                }
                return;
            }

            if (eventType === EVENT_TYPES.STATS_RESET && data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                invalidateSessionDeck(sessionCode);

                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} reset session stats`, {
                        description: "All swipes and matches have been cleared.",
                        position: 'top-right'
                    });
                }
                return;
            }

            if (eventType === EVENT_TYPES.USER_JOINED && data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(sessionCode) });
                invalidateSessionDeck(sessionCode);
                queryClient.invalidateQueries({ queryKey: ["media", "watchProviders"] });

                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} joined the session`, {
                        position: 'top-right'
                    });
                }
                return;
            }

            if (eventType === EVENT_TYPES.USER_LEFT && data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
                invalidateSessionDeck(sessionCode);
                queryClient.invalidateQueries({ queryKey: ["media", "watchProviders"] });

                if (userId && data.userId !== userId) {
                    toast.info(`${data.userName} left the session`, {
                        position: 'top-right'
                    });
                }
                return;
            }

            if (eventType === EVENT_TYPES.LIKE_UPDATED && data.sessionCode === sessionCode) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
                if (data.itemId) {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, true) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(data.itemId, sessionCode, false) });
                }
                return;
            }

            if (eventType === EVENT_TYPES.ADMIN_CONFIG_UPDATED) {
                if (data.type === 'libraries') {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.libraries });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.libraries });
                    invalidateSessionDeck(sessionCode);
                } else if (data.type === 'filters') {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.genres });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.years });
                    queryClient.invalidateQueries({ queryKey: ["media", "ratings"] });
                    invalidateSessionDeck(sessionCode);
                }

                if (userId && data.userId !== userId) {
                    toast.info(`Admin updated ${data.type === 'libraries' ? 'libraries' : 'global settings'}`, {
                        description: "The application has been updated.",
                        position: 'top-right'
                    });
                }
            }
        };

        const stepDown = () => {
            isLeader = false;
            closeEventSource();
        };

        const broadcastLeaderAlive = () => {
            channel.postMessage({ type: 'leader-alive', tabId, sessionCode, at: Date.now() });
        };

        const becomeLeader = () => {
            if (isLeader || document.visibilityState !== 'visible') return;
            isLeader = true;
            lastLeaderSeenAt = Date.now();
            channel.postMessage({ type: 'leader-claim', tabId, sessionCode, at: Date.now() });
            broadcastLeaderAlive();

            closeEventSource();
            eventSource = new EventSource(`${basePath}/api/events`);

            const forward = async (eventType: string, message: MessageEvent) => {
                channel.postMessage({ type: 'event', tabId, sessionCode, eventType, payload: message.data });
                await processEvent(eventType, message.data);
            };

            eventSource.addEventListener(EVENT_TYPES.SESSION_UPDATED, (event) => { void forward(EVENT_TYPES.SESSION_UPDATED, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.MATCH_FOUND, (event) => { void forward(EVENT_TYPES.MATCH_FOUND, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.MATCH_REMOVED, (event) => { void forward(EVENT_TYPES.MATCH_REMOVED, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.FILTERS_UPDATED, (event) => { void forward(EVENT_TYPES.FILTERS_UPDATED, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.SETTINGS_UPDATED, (event) => { void forward(EVENT_TYPES.SETTINGS_UPDATED, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.STATS_RESET, (event) => { void forward(EVENT_TYPES.STATS_RESET, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.USER_JOINED, (event) => { void forward(EVENT_TYPES.USER_JOINED, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.USER_LEFT, (event) => { void forward(EVENT_TYPES.USER_LEFT, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.LIKE_UPDATED, (event) => { void forward(EVENT_TYPES.LIKE_UPDATED, event as MessageEvent); });
            eventSource.addEventListener(EVENT_TYPES.ADMIN_CONFIG_UPDATED, (event) => { void forward(EVENT_TYPES.ADMIN_CONFIG_UPDATED, event as MessageEvent); });

            eventSource.onerror = () => {
                closeEventSource();
            };

            if (leaderHeartbeat !== null) {
                window.clearInterval(leaderHeartbeat);
            }
            leaderHeartbeat = window.setInterval(() => {
                if (!isLeader) return;
                if (document.visibilityState !== 'visible') {
                    stepDown();
                    return;
                }
                broadcastLeaderAlive();
            }, LEADER_HEARTBEAT_MS);
        };

        const maybeBecomeLeader = () => {
            if (document.visibilityState !== 'visible') {
                stepDown();
                return;
            }
            if (!isLeader && Date.now() - lastLeaderSeenAt > LEADER_TIMEOUT_MS) {
                becomeLeader();
            }
        };

        channel.onmessage = (message) => {
            const data = message.data as any;
            if (!data || data.sessionCode !== sessionCode || data.tabId === tabId) return;

            if (data.type === 'leader-claim') {
                lastLeaderSeenAt = Date.now();
                if (isLeader) {
                    if (tabId < data.tabId) {
                        broadcastLeaderAlive();
                    } else {
                        stepDown();
                    }
                }
                return;
            }

            if (data.type === 'leader-alive') {
                lastLeaderSeenAt = Date.now();
                if (isLeader && tabId > data.tabId) {
                    stepDown();
                }
                return;
            }

            if (data.type === 'event' && data.eventType && typeof data.payload === 'string') {
                void processEvent(data.eventType, data.payload);
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                stepDown();
            }
            maybeBecomeLeader();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        lastLeaderSeenAt = 0;
        maybeBecomeLeader();

        leadershipCheck = window.setInterval(() => {
            maybeBecomeLeader();
        }, LEADER_HEARTBEAT_MS);

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            stepDown();
            if (leaderHeartbeat !== null) {
                window.clearInterval(leaderHeartbeat);
            }
            if (leadershipCheck !== null) {
                window.clearInterval(leadershipCheck);
            }
            channel.close();
        };
    }, [sessionCode, userId, queryClient, openMovie, basePath, invalidateSessionDeck]);
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
