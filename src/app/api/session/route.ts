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

        // Register member
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

    const { filters } = await request.json();

    if (session.sessionCode) {
        await db.update(sessions)
            .set({ filters: JSON.stringify(filters) })
            .where(eq(sessions.code, session.sessionCode));

        events.emit(EVENT_TYPES.FILTERS_UPDATED, {
            sessionCode: session.sessionCode,
            userId: session.user.Id,
            userName: session.user.Name,
            filters
        });
    } else {
        session.soloFilters = filters;
        await session.save();
    }

    return NextResponse.json({ success: true });
}

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { accessToken, userId: effectiveUserId } = await getEffectiveCredentials(session);

  let filters = session.soloFilters || null;
  if (session.sessionCode) {
    const currentSession = await db.query.sessions.findFirst({
        where: eq(sessions.code, session.sessionCode)
    });
    filters = currentSession?.filters ? JSON.parse(currentSession.filters) : null;
  }

  const response = { 
    code: session.sessionCode || null,
    userId: session.user.Id,
    effectiveUserId,
    isGuest: !!session.user.isGuest,
    isAdmin: await isAdmin(session.user.Id, session.user.Name),
    accessToken,
    filters
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
