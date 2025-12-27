import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { db, sessions, sessionMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.sessionCode && session.user?.Id) {
    const code = session.sessionCode;
    // 1. Remove member from session
    await db.delete(sessionMembers).where(
        and(
            eq(sessionMembers.sessionCode, code),
            eq(sessionMembers.jellyfinUserId, session.user.Id)
        )
    );

    // 2. Check if any members left
    const remainingMembers = await db.query.sessionMembers.findMany({
        where: eq(sessionMembers.sessionCode, code),
    });

    if (remainingMembers.length === 0) {
        // 3. Delete session if no members left
        await db.delete(sessions).where(eq(sessions.code, code));
    }
  }

  session.destroy();

  return NextResponse.json({ success: true });
}
