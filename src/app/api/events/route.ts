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
            const onSessionUpdate = (sessionCode: string) => {
                if (session.sessionCode === sessionCode) {
                    controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.SESSION_UPDATED}\ndata: ${JSON.stringify({ sessionCode })}\n\n`));
                }
            };


            const onMatch = (payload: { sessionCode: string; itemId: string }) => {
                if (session.sessionCode === payload.sessionCode) {
                    controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.MATCH_FOUND}\ndata: ${JSON.stringify(payload)}\n\n`));
                }
            };

            const onFiltersUpdate = (payload: { sessionCode: string; userName: string; filters: any }) => {
                if (session.sessionCode === payload.sessionCode) {
                    controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.FILTERS_UPDATED}\ndata: ${JSON.stringify(payload)}\n\n`));
                }
            };

            events.on(EVENT_TYPES.SESSION_UPDATED, onSessionUpdate);
            events.on(EVENT_TYPES.MATCH_FOUND, onMatch);
            events.on(EVENT_TYPES.FILTERS_UPDATED, onFiltersUpdate);

            // Keep-alive interval
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(": keepalive\n\n"));
            }, 30000);

            request.signal.onabort = () => {
                events.off(EVENT_TYPES.SESSION_UPDATED, onSessionUpdate);
                events.off(EVENT_TYPES.MATCH_FOUND, onMatch);
                events.off(EVENT_TYPES.FILTERS_UPDATED, onFiltersUpdate);
                clearInterval(keepAlive);
            };
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    });
}
