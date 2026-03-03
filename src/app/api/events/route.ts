import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { db } from "@/lib/db";
import { sessionEvents } from "@/db/schema";
import { and, eq, gt, or, asc, desc } from "drizzle-orm";
import { GLOBAL_SESSION_CODE } from "@/lib/services/event-service";

// Allow long-lived SSE connections on Vercel Hobby (max 60s) and similar platforms.
export const maxDuration = 60;

/** How long (ms) the server-side loop waits between DB polls when idle. */
const POLL_INTERVAL_MS = 500;

/** How often (ms) a keepalive comment is sent to prevent proxy timeouts. */
const KEEPALIVE_INTERVAL_MS = 25_000;

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    // Only serve SSE to authenticated users who are in a session.
    // Unauthenticated or session-less users don't need the stream.
    if (!session.isLoggedIn || !session.sessionCode) {
        return new Response(null, { status: 204 });
    }

    const sessionCode = session.sessionCode;
    const encoder = new TextEncoder();

    // Capture the latest event ID at the moment of connection so we only
    // deliver events that were created *after* the client connected.
    const latestRow = await db
        .select({ id: sessionEvents.id })
        .from(sessionEvents)
        .orderBy(desc(sessionEvents.id))
        .limit(1);

    let lastSeenId: number = latestRow[0]?.id ?? 0;

    const stream = new ReadableStream({
        async start(controller) {
            // Send an initial comment so the client knows the connection is live.
            controller.enqueue(encoder.encode(": connected\n\n"));

            // Keepalive ticker — prevents proxies and load-balancers from
            // closing the connection due to inactivity.
            const keepAlive = setInterval(() => {
                if (request.signal.aborted) return;
                try {
                    controller.enqueue(encoder.encode(": keepalive\n\n"));
                } catch {
                    clearInterval(keepAlive);
                }
            }, KEEPALIVE_INTERVAL_MS);

            // Main event-delivery loop.
            // Runs until the client disconnects (abort signal fires).
            while (!request.signal.aborted) {
                try {
                    // Fetch all new events for this session (or global) since
                    // the last cursor position.
                    const newEvents = await db
                        .select()
                        .from(sessionEvents)
                        .where(
                            and(
                                gt(sessionEvents.id, lastSeenId),
                                or(
                                    eq(sessionEvents.sessionCode, sessionCode),
                                    eq(sessionEvents.sessionCode, GLOBAL_SESSION_CODE)
                                )
                            )
                        )
                        .orderBy(asc(sessionEvents.id));

                    for (const ev of newEvents) {
                        try {
                            controller.enqueue(
                                encoder.encode(
                                    `event: ${ev.type}\ndata: ${ev.payload}\n\n`
                                )
                            );
                        } catch {
                            // Stream was closed mid-loop; bail out.
                            clearInterval(keepAlive);
                            return;
                        }
                    }

                    if (newEvents.length > 0) {
                        lastSeenId = newEvents[newEvents.length - 1].id;
                    }
                } catch {
                    // DB error — log and continue; the loop will retry after
                    // the sleep below rather than crashing the stream.
                }

                // Yield to the event loop and wait before the next poll.
                // This is the only "polling" — it happens server-side and is
                // invisible to the browser client.
                await new Promise<void>((resolve) => {
                    const t = setTimeout(resolve, POLL_INTERVAL_MS);
                    // If the client disconnects while we're sleeping, wake up
                    // immediately so we can exit the loop cleanly.
                    request.signal.addEventListener("abort", () => {
                        clearTimeout(t);
                        resolve();
                    }, { once: true });
                });
            }

            clearInterval(keepAlive);
            try {
                controller.close();
            } catch {
                // Already closed — ignore.
            }
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
