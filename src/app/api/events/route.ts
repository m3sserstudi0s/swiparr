import { NextRequest } from "next/server";
import { events, EVENT_TYPES } from "@/lib/events";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { checkQuickConnect } from "@/lib/jellyfin/api";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    const encoder = new TextEncoder();
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("qcSecret");

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

            const onQCAuth = (payload: { secret: string }) => {
                if (querySecret === payload.secret) {
                    controller.enqueue(encoder.encode(`event: ${EVENT_TYPES.QUICK_CONNECT_AUTHORIZED}\ndata: ${JSON.stringify({ authorized: true })}\n\n`));
                }
            };

            events.on(EVENT_TYPES.SESSION_UPDATED, onSessionUpdate);
            events.on(EVENT_TYPES.MATCH_FOUND, onMatch);
            events.on(EVENT_TYPES.QUICK_CONNECT_AUTHORIZED, onQCAuth);

            // If we have a qcSecret, we might want to start polling Jellyfin if not already polling
            let qcInterval: NodeJS.Timeout | null = null;
            if (querySecret) {
                qcInterval = setInterval(async () => {
                   try {
                       const authData = await checkQuickConnect(querySecret);
                       if (authData.AccessToken) {
                           // Authorized! We need to save the session, but we can't easily do it here
                           // for the client's iron-session because we don't have their response object 
                           // in a way that saves cookies correctly from within this GET stream for a different request.
                           
                           // Actually, we SHOULD emit the event so the client knows it can now call the login check
                           events.emit(EVENT_TYPES.QUICK_CONNECT_AUTHORIZED, { secret: querySecret });
                           if (qcInterval) clearInterval(qcInterval);
                       }
                   } catch (e) {
                       // Ignore errors
                   }
                }, 5000);
            }

            // Keep-alive interval
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(": keepalive\n\n"));
            }, 30000);

            request.signal.onabort = () => {
                events.off(EVENT_TYPES.SESSION_UPDATED, onSessionUpdate);
                events.off(EVENT_TYPES.MATCH_FOUND, onMatch);
                events.off(EVENT_TYPES.QUICK_CONNECT_AUTHORIZED, onQCAuth);
                clearInterval(keepAlive);
                if (qcInterval) clearInterval(qcInterval);
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
