import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, sessions, sessionMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { v4 as uuidv4 } from "uuid";
import { events, EVENT_TYPES } from "@/lib/events";
import { isAdmin } from "@/lib/server/admin";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";



function generateCode() {
    // Simple 4-letter code (e.g., AXYZ)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();

    // ACTION: JOIN
    if (body.action === "join") {
        const code = body.code.toUpperCase();
        const existingSession = await db.query.sessions.findFirst({
            where: eq(sessions.code, code),
        });


        if (!existingSession) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Guests can only join sessions with guest lending enabled
        if (session.user.isGuest && !existingSession.hostAccessToken) {
            return NextResponse.json({ error: "This session does not allow guests" }, { status: 403 });
        }

        // If already in a different session, leave it first
        if (session.sessionCode && session.sessionCode !== code) {
            const oldCode = session.sessionCode;
            
            // Remove from old session
            await db.delete(sessionMembers).where(
                and(
                    eq(sessionMembers.sessionCode, oldCode),
                    eq(sessionMembers.jellyfinUserId, session.user.Id)
                )
            );

            // Check if old session is now empty
            const remainingMembers = await db.query.sessionMembers.findMany({
                where: eq(sessionMembers.sessionCode, oldCode),
            });

            if (remainingMembers.length === 0) {
                await db.delete(sessions).where(eq(sessions.code, oldCode));
            } else {
                events.emit(EVENT_TYPES.SESSION_UPDATED, oldCode);
            }
        }

        // Register member in new session
        try {
            await db.insert(sessionMembers).values({
                sessionCode: code,
                jellyfinUserId: session.user.Id,
                jellyfinUserName: session.user.Name,
            }).onConflictDoNothing();
        } catch (e) {
            // Ignore if already member
        }

        session.sessionCode = code;
        await session.save();

        events.emit(EVENT_TYPES.SESSION_UPDATED, code);

        return NextResponse.json({ success: true, code });
    }

    // ACTION: CREATE
    if (body.action === "create") {
        const code = generateCode();
        const allowLending = body.allowGuestLending === true;

        await db.insert(sessions).values({
            id: uuidv4(),
            code,
            hostUserId: session.user.Id,
            hostAccessToken: allowLending ? session.user.AccessToken : null,
            hostDeviceId: allowLending ? session.user.DeviceId : null,
        });

        // Register host as member
        await db.insert(sessionMembers).values({
            sessionCode: code,
            jellyfinUserId: session.user.Id,
            jellyfinUserName: session.user.Name,
        });


        session.sessionCode = code;
        await session.save();

        events.emit(EVENT_TYPES.SESSION_UPDATED, code);

        return NextResponse.json({ success: true, code });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();

    // Handle guest lending toggle
    if (body.allowGuestLending !== undefined && session.sessionCode) {
        const currentSession = await db.query.sessions.findFirst({
            where: eq(sessions.code, session.sessionCode)
        });

        console.log("[Session PATCH] Guest lending toggle:", {
            allowGuestLending: body.allowGuestLending,
            sessionCode: session.sessionCode,
            userId: session.user.Id,
            hostUserId: currentSession?.hostUserId,
            hasAccessToken: !!session.user.AccessToken
        });

        // Only the host can toggle guest lending
        if (currentSession && currentSession.hostUserId === session.user.Id) {
            await db.update(sessions)
                .set({
                    hostAccessToken: body.allowGuestLending ? session.user.AccessToken : null,
                    hostDeviceId: body.allowGuestLending ? session.user.DeviceId : null,
                })
                .where(eq(sessions.code, session.sessionCode));

            console.log("[Session PATCH] Updated hostAccessToken:", body.allowGuestLending ? "set" : "cleared");
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Only the host can change guest lending" }, { status: 403 });
        }
    }

    // Handle filters and settings update
    if (body.filters !== undefined || body.settings !== undefined) {
        if (session.sessionCode) {
            const updateData: Record<string, string> = {};
            if (body.filters !== undefined) updateData.filters = JSON.stringify(body.filters);
            if (body.settings !== undefined) updateData.settings = JSON.stringify(body.settings);

            await db.update(sessions)
                .set(updateData)
                .where(eq(sessions.code, session.sessionCode));

            if (body.filters !== undefined) {
                events.emit(EVENT_TYPES.FILTERS_UPDATED, {
                    sessionCode: session.sessionCode,
                    userId: session.user.Id,
                    userName: session.user.Name,
                    filters: body.filters
                });
            }

            if (body.settings !== undefined) {
                events.emit(EVENT_TYPES.SETTINGS_UPDATED, {
                    sessionCode: session.sessionCode,
                    userId: session.user.Id,
                    userName: session.user.Name,
                    settings: body.settings
                });
            }
        } else {
            if (body.filters !== undefined) session.soloFilters = body.filters;
            await session.save();
        }

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No valid update provided" }, { status: 400 });
}

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { accessToken, userId: effectiveUserId } = await getEffectiveCredentials(session);

  let filters = session.soloFilters || null;
  let settings = null;
  if (session.sessionCode) {
    const currentSession = await db.query.sessions.findFirst({
        where: eq(sessions.code, session.sessionCode)
    });
    filters = currentSession?.filters ? JSON.parse(currentSession.filters) : null;
    settings = currentSession?.settings ? JSON.parse(currentSession.settings) : null;
  }

  const response = { 
    code: session.sessionCode || null,
    userId: session.user.Id,
    effectiveUserId,
    isGuest: !!session.user.isGuest,
    isAdmin: await isAdmin(session.user.Id, session.user.Name),
    accessToken,
    filters,
    settings
  };

  return NextResponse.json(response);
}

export async function DELETE() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
    if (session.isLoggedIn && session.user && session.sessionCode) {
        const code = session.sessionCode;
        const userId = session.user.Id;

        // 1. Remove member from session
        await db.delete(sessionMembers).where(
            and(
                eq(sessionMembers.sessionCode, code),
                eq(sessionMembers.jellyfinUserId, userId)
            )
        );

        // 2. Check if any members left
        const remainingMembers = await db.query.sessionMembers.findMany({
            where: eq(sessionMembers.sessionCode, code),
        });

        if (remainingMembers.length === 0) {
            // 3. Delete session if no members left (will cascade to likes/hiddens)
            await db.delete(sessions).where(eq(sessions.code, code));
        } else {
            events.emit(EVENT_TYPES.SESSION_UPDATED, code);
        }
    }

    session.sessionCode = undefined;
    await session.save();
    return NextResponse.json({ success: true });
}
