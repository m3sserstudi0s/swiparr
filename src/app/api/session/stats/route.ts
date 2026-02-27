import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, likes, hiddens, sessionMembers, sessions } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData, SessionStats } from "@/types";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn || !session.sessionCode) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionCode = session.sessionCode;
    const userId = session.user.Id;

    // 1. My Swipes
    const myLikesCount = await db.select({ count: sql<number>`count(*)` })
        .from(likes)
        .where(and(eq(likes.sessionCode, sessionCode), eq(likes.externalUserId, userId)));
    
    const myHiddensCount = await db.select({ count: sql<number>`count(*)` })
        .from(hiddens)
        .where(and(eq(hiddens.sessionCode, sessionCode), eq(hiddens.externalUserId, userId)));

    const myRight = myLikesCount[0].count;
    const myLeft = myHiddensCount[0].count;
    const myTotal = myRight + myLeft;
    const myLikeRate = myTotal > 0 ? (myRight / myTotal) * 100 : 0;

    // 2. Total Session Swipes
    const totalLikesCount = await db.select({ count: sql<number>`count(*)` })
        .from(likes)
        .where(eq(likes.sessionCode, sessionCode));
    
    const totalHiddensCount = await db.select({ count: sql<number>`count(*)` })
        .from(hiddens)
        .where(eq(hiddens.sessionCode, sessionCode));

    const totalRight = totalLikesCount[0].count;
    const totalLeft = totalHiddensCount[0].count;
    const totalSwipesCount = totalRight + totalLeft;

    // 3. Average per member
    const membersCount = await db.select({ count: sql<number>`count(*)` })
        .from(sessionMembers)
        .where(eq(sessionMembers.sessionCode, sessionCode));
    
    const numMembers = membersCount[0].count || 1;

    const avgRight = totalRight / numMembers;
    const avgLeft = totalLeft / numMembers;
    const avgLikeRate = totalSwipesCount > 0 ? (totalRight / totalSwipesCount) * 100 : 0;

    const stats: SessionStats = {
        mySwipes: { left: myLeft, right: myRight },
        myLikeRate,
        avgSwipes: { left: avgLeft, right: avgRight },
        avgLikeRate,
        totalSwipes: { left: totalLeft, right: totalRight }
    };

    return NextResponse.json(stats);
}

export async function DELETE(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn || !session.sessionCode) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionCode = session.sessionCode;

    // Only the host may reset session stats (H4)
    const currentSession = await db.query.sessions.findFirst({
        where: eq(sessions.code, sessionCode),
    });
    if (!currentSession || currentSession.hostUserId !== session.user.Id) {
        return NextResponse.json({ error: "Only the host can reset stats" }, { status: 403 });
    }

    // Delete all likes and hiddens for this session
    await db.delete(likes).where(eq(likes.sessionCode, sessionCode));
    await db.delete(hiddens).where(eq(hiddens.sessionCode, sessionCode));

    // Emit event
    const { EventService } = await import("@/lib/services/event-service");
    const { EVENT_TYPES } = await import("@/lib/events");
    await EventService.emit(EVENT_TYPES.STATS_RESET, {
        sessionCode,
        userId: session.user.Id,
        userName: session.user.Name,
    });

    return NextResponse.json({ success: true });
}
