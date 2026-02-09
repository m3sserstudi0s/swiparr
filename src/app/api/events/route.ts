import { NextRequest } from "next/server";
import { events, EVENT_TYPES } from "@/lib/events";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let closed = false;
            let keepAlive: any;

            const onSessionUpdate = (payload: any) => {
                const isString = typeof payload === 'string';
                const sessionCode = isString ? payload : payload.sessionCode;
                
                if (!closed && session.sessionCode === sessionCode) {
                    try {
                        const data = isString ? { sessionCode } : payload;
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.SESSION_UPDATED}\ndata: ${JSON.stringify(data)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onMatch = (payload: { sessionCode: string; itemId: string }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.MATCH_FOUND}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onMatchRemoved = (payload: { sessionCode: string; itemId: string }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.MATCH_REMOVED}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onFiltersUpdate = (payload: { sessionCode: string; userName: string; filters: any }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.FILTERS_UPDATED}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onSettingsUpdate = (payload: { sessionCode: string; userName: string; settings: any }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.SETTINGS_UPDATED}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onStatsReset = (payload: { sessionCode: string; userName: string }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.STATS_RESET}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onUserJoined = (payload: { sessionCode: string; userName: string }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.USER_JOINED}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onUserLeft = (payload: { sessionCode: string; userName: string }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.USER_LEFT}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onLike = (payload: { sessionCode: string; itemId: string }) => {
                if (!closed && session.sessionCode === payload.sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.LIKE_UPDATED}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const onAdminConfigUpdate = (payload: any) => {
                if (!closed) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.ADMIN_CONFIG_UPDATED}\ndata: ${JSON.stringify(payload)}\n\n`));
                    } catch (e) {
                        cleanup();
                    }
                }
            };

            const cleanup = () => {
                if (closed) return;
                closed = true;
                events.off(EVENT_TYPES.SESSION_UPDATED, onSessionUpdate);
                events.off(EVENT_TYPES.MATCH_FOUND, onMatch);
                events.off(EVENT_TYPES.MATCH_REMOVED, onMatchRemoved);
                events.off(EVENT_TYPES.FILTERS_UPDATED, onFiltersUpdate);
                events.off(EVENT_TYPES.SETTINGS_UPDATED, onSettingsUpdate);
                events.off(EVENT_TYPES.STATS_RESET, onStatsReset);
                events.off(EVENT_TYPES.USER_JOINED, onUserJoined);
                events.off(EVENT_TYPES.USER_LEFT, onUserLeft);
                events.off(EVENT_TYPES.LIKE_UPDATED, onLike);
                events.off(EVENT_TYPES.ADMIN_CONFIG_UPDATED, onAdminConfigUpdate);
                if (keepAlive) clearInterval(keepAlive);
                try {
                    controller.close();
                } catch (e) {
                    // Ignore errors if already closed
                }
            };

            events.on(EVENT_TYPES.SESSION_UPDATED, onSessionUpdate);
            events.on(EVENT_TYPES.MATCH_FOUND, onMatch);
            events.on(EVENT_TYPES.MATCH_REMOVED, onMatchRemoved);
            events.on(EVENT_TYPES.FILTERS_UPDATED, onFiltersUpdate);
            events.on(EVENT_TYPES.SETTINGS_UPDATED, onSettingsUpdate);
            events.on(EVENT_TYPES.STATS_RESET, onStatsReset);
            events.on(EVENT_TYPES.USER_JOINED, onUserJoined);
            events.on(EVENT_TYPES.USER_LEFT, onUserLeft);
            events.on(EVENT_TYPES.LIKE_UPDATED, onLike);
            events.on(EVENT_TYPES.ADMIN_CONFIG_UPDATED, onAdminConfigUpdate);

            keepAlive = setInterval(() => {
                if (!closed) {
                    try {
                        controller.enqueue(encoder.encode(": keepalive\n\n"));
                    } catch (e) {
                        cleanup();
                    }
                }
            }, 30000);

            request.signal.addEventListener('abort', cleanup);
            
            // In some environments, the stream might be closed without abort signal
            // This is a fallback to ensure we eventually clean up
            const checkInterval = setInterval(() => {
                if (request.signal.aborted) {
                    cleanup();
                    clearInterval(checkInterval);
                }
            }, 60000);

        },
        cancel() {
            // Handled via abort signal and internal state
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    });
}
