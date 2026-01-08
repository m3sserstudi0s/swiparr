import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { db, sessions, sessionMembers, likes, hiddens } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { events, EVENT_TYPES } from "@/lib/events";
import { SessionSettings } from "@/types/swiparr";

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.sessionCode && session.user?.Id) {
    const code = session.sessionCode;
    const userId = session.user.Id;
    const userName = session.user.Name;

    // 0. Find items this user liked in this session
    const userLikes = await db.query.likes.findMany({
        where: and(
            eq(likes.sessionCode, code),
            eq(likes.jellyfinUserId, userId)
        )
    });
    const likedItemIds = userLikes.map(l => l.jellyfinItemId);

    // 1. Remove member from session
    await db.delete(sessionMembers).where(
        and(
            eq(sessionMembers.sessionCode, code),
            eq(sessionMembers.jellyfinUserId, userId)
        )
    );

    // 1.1 Clear user's traces (likes and hiddens) for this session
    await db.delete(likes).where(
        and(
            eq(likes.sessionCode, code),
            eq(likes.jellyfinUserId, userId)
        )
    );
    await db.delete(hiddens).where(
        and(
            eq(hiddens.sessionCode, code),
            eq(hiddens.jellyfinUserId, userId)
        )
    );

    // 2. Check if any members left
    const remainingMembers = await db.query.sessionMembers.findMany({
        where: eq(sessionMembers.sessionCode, code),
    });

    if (remainingMembers.length === 0) {
        // 3. Delete session if no members left
        await db.delete(sessions).where(eq(sessions.code, code));
    } else {
        // 4. Re-evaluate matches for the items the user liked
        if (likedItemIds.length > 0) {
            const currentSession = await db.query.sessions.findFirst({
                where: eq(sessions.code, code)
            });
            const settings: SessionSettings = currentSession?.settings ? JSON.parse(currentSession.settings) : {};
            const matchStrategy = settings.matchStrategy || "atLeastTwo";
            const numMembers = remainingMembers.length;

            for (const itemId of likedItemIds) {
                const remainingItemLikes = await db.query.likes.findMany({
                    where: and(
                        eq(likes.sessionCode, code),
                        eq(likes.jellyfinItemId, itemId)
                    )
                });

                let stillAMatch = false;
                if (matchStrategy === "atLeastTwo") {
                    stillAMatch = remainingItemLikes.length >= 2;
                } else if (matchStrategy === "allMembers") {
                    stillAMatch = remainingItemLikes.length >= numMembers && numMembers > 0;
                }

                if (!stillAMatch) {
                    await db.update(likes)
                        .set({ isMatch: false })
                        .where(and(
                            eq(likes.sessionCode, code),
                            eq(likes.jellyfinItemId, itemId)
                        ));
                }
            }
        }

        events.emit(EVENT_TYPES.USER_LEFT, { sessionCode: code, userName, userId });
        events.emit(EVENT_TYPES.SESSION_UPDATED, code);
    }
  }

  session.destroy();

  return NextResponse.json({ success: true });
}
