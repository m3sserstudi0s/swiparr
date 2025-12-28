import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { useQueryClient } from '@tanstack/react-query';
import { EVENT_TYPES } from './events';

export function useUpdates(sessionCode?: string | null) {
    const { mutate } = useSWRConfig();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!sessionCode) return;

        const eventSource = new EventSource('/api/events');

        eventSource.addEventListener(EVENT_TYPES.SESSION_UPDATED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate session members
                mutate('/api/session/members');
                // Invalidate deck to get fresh cards for new member configuration
                queryClient.invalidateQueries({ queryKey: ['deck'] });
            }
        });

        eventSource.addEventListener(EVENT_TYPES.MATCH_FOUND, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate matches
                mutate('/api/session/matches');
            }
        });

        return () => {
            eventSource.close();
        };
    }, [sessionCode, mutate]);
}

export function useQuickConnectUpdates(qcSecret?: string | null, onAuthorized?: () => void) {
    useEffect(() => {
        if (!qcSecret) return;

        // Use polling instead of SSE for quick connect to avoid secret consumption issues
        // and because it's more reliable across different environments.
        const poll = async () => {
            try {
                const res = await fetch("/api/auth/quick-connect", {
                    method: "POST",
                    body: JSON.stringify({ secret: qcSecret }),
                    headers: { "Content-Type": "application/json" },
                });
                const data = await res.json();
                if (data.success) {
                    onAuthorized?.();
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
