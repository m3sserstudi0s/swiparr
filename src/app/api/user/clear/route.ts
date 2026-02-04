import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, likes as likesTable, hiddens as hiddensTable, sessions as sessionsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types";

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = session.user.Id;

  try {
    // 1. Find sessions hosted by this user
    const userSessions = await db.select().from(sessionsTable).where(eq(sessionsTable.hostUserId, userId));
    const sessionCodes = userSessions.map(s => s.code);

    // 2. Clear all likes/hiddens associated with those sessions (even from other users)
    // to avoid FK violations when deleting the session
    if (sessionCodes.length > 0) {
      for (const code of sessionCodes) {
        await db.delete(likesTable).where(eq(likesTable.sessionCode, code));
        await db.delete(hiddensTable).where(eq(hiddensTable.sessionCode, code));
      }
    }

    // 3. Clear user's own likes/hiddens (including those not in sessions)
    await db.delete(likesTable).where(eq(likesTable.externalUserId, userId));
    await db.delete(hiddensTable).where(eq(hiddensTable.externalUserId, userId));

    // 4. Finally delete the sessions hosted by the user
    await db.delete(sessionsTable).where(eq(sessionsTable.hostUserId, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear data error:", error);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
