import { NextRequest } from "next/server";
import { events, EVENT_TYPES } from "@/lib/events";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let closed = false;
            let keepAlive: any;

            const onSessionUpdate = (sessionCode: string) => {
                if (!closed && session.sessionCode === sessionCode) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.SESSION_UPDATED}\ndata: ${JSON.stringify({ sessionCode })}\n\n`));
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

            const cleanup = () => {
                if (closed) return;
                closed = true;
                events.off(EVENT_TYPES.SESSION_UPDATED, onSessionUpdate);
                events.off(EVENT_TYPES.MATCH_FOUND, onMatch);
                events.off(EVENT_TYPES.MATCH_REMOVED, onMatchRemoved);
                events.off(EVENT_TYPES.FILTERS_UPDATED, onFiltersUpdate);
                events.off(EVENT_TYPES.SETTINGS_UPDATED, onSettingsUpdate);
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
