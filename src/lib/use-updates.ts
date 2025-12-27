import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { EVENT_TYPES } from './events';

export function useUpdates(sessionCode?: string | null) {
    const { mutate } = useSWRConfig();

    useEffect(() => {
        if (!sessionCode) return;

        const eventSource = new EventSource('/api/events');

        eventSource.addEventListener(EVENT_TYPES.SESSION_UPDATED, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate session members
                mutate('/api/session/members');
            }
        });

        eventSource.addEventListener(EVENT_TYPES.MATCH_FOUND, (event: any) => {
            const data = JSON.parse(event.data);
            if (data.sessionCode === sessionCode) {
                // Invalidate matches
                mutate('/api/session/matches');
                // You could also trigger a toast or something here
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

        const eventSource = new EventSource(`/api/events?qcSecret=${qcSecret}`);

        eventSource.addEventListener(EVENT_TYPES.QUICK_CONNECT_AUTHORIZED, () => {
            onAuthorized?.();
        });

        return () => {
            eventSource.close();
        };
    }, [qcSecret, onAuthorized]);
}
