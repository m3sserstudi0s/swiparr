import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, sessionMembers, userProfiles, sessions } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    
    if (!session.isLoggedIn || !session.sessionCode) {
        return NextResponse.json([]);
    }

    const members = await db.select({
        externalUserId: sessionMembers.externalUserId,
        externalUserName: sessionMembers.externalUserName,
        isAdmin: sql<boolean>`CASE WHEN ${sessions.hostUserId} = ${sessionMembers.externalUserId} THEN 1 ELSE 0 END`,
        hasCustomProfilePicture: sql<boolean>`CASE WHEN ${userProfiles.userId} IS NOT NULL THEN 1 ELSE 0 END`,
        profileUpdatedAt: userProfiles.updatedAt,
        joinedAt: sessionMembers.joinedAt,
    })
    .from(sessionMembers)
    .leftJoin(userProfiles, eq(sessionMembers.externalUserId, userProfiles.userId))
    .leftJoin(sessions, eq(sessionMembers.sessionCode, sessions.code))
    .where(eq(sessionMembers.sessionCode, session.sessionCode));

    return NextResponse.json(members);
}
