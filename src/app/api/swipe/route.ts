import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes, hiddens, sessionMembers, sessions } from "@/lib/db";
import { eq, and, ne, count, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData, SwipePayload, SessionSettings } from "@/types/swiparr";
import { events, EVENT_TYPES } from "@/lib/events";


export async function POST(request: NextRequest) {

    const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: SwipePayload = await request.json();
  let isMatch = false;

  try {
    const sessionCode = session.sessionCode;
    let settings: SessionSettings | null = null;
    
    if (sessionCode) {
        const s = await db.query.sessions.findFirst({
            where: eq(sessions.code, sessionCode)
        });
        if (s?.settings) {
            settings = JSON.parse(s.settings);
        }
    }

    if (body.direction === "right") {
      // Check right swipe limit
      if (settings?.maxRightSwipes !== undefined && settings.maxRightSwipes > 0) {
          const rightCount = await db.select({ value: count() }).from(likes).where(and(eq(likes.sessionCode, sessionCode!), eq(likes.jellyfinUserId, session.user.Id)));
          if (rightCount[0].value >= settings.maxRightSwipes) {
              return NextResponse.json({ error: "Right swipe limit reached" }, { status: 403 });
          }
      }

      // Check max matches limit
      if (settings?.maxMatches !== undefined && settings.maxMatches > 0) {
          const matchCount = await db.select({ value: count() }).from(likes).where(and(eq(likes.sessionCode, sessionCode!), eq(likes.isMatch, true)));
          // This counts individual "match" rows. Since each match has at least 2 rows, we divide by 2? 
          // Actually isMatch is set on ALL likes that are part of the match.
          // So if 2 people match, there are 2 rows with isMatch = true for that itemId.
          // But wait, the current logic only sets isMatch=true for the current swipe and the ONE existing like it found.
          // If there are 3 people, and 2 already liked, and 1 now likes:
          // Existing likes for that itemId: 2.
          // If it's a match, it should probably count as 1 match regardless of how many people liked it.
          const uniqueMatches = await db.select({ value: sql`count(distinct ${likes.jellyfinItemId})` }).from(likes).where(and(eq(likes.sessionCode, sessionCode!), eq(likes.isMatch, true)));
          if ((uniqueMatches[0] as any).value >= settings.maxMatches) {
              // We can still like it, but it won't be a match? 
              // Usually "max matches" means no more matches can be created.
          }
      }

      // 1. Check if we are in a session
      if (sessionCode) {
        const members = await db.query.sessionMembers.findMany({
            where: eq(sessionMembers.sessionCode, sessionCode)
        });
        const numMembers = members.length;

        // 2. Check existing likes from OTHERS
        const existingLikes = await db.query.likes.findMany({
          where: and(
            eq(likes.sessionCode, sessionCode),
            eq(likes.jellyfinItemId, body.itemId),
            ne(likes.jellyfinUserId, session.user.Id)
          )
        });

        const matchStrategy = settings?.matchStrategy || "atLeastTwo";
        
        if (matchStrategy === "atLeastTwo") {
            if (existingLikes.length > 0) {
                isMatch = true;
            }
        } else if (matchStrategy === "allMembers") {
            if (existingLikes.length >= numMembers - 1 && numMembers > 1) {
                isMatch = true;
            }
        }

        // Check max matches limit again if we are about to create a match
        if (isMatch && settings?.maxMatches !== undefined && settings.maxMatches > 0) {
            const uniqueMatches = await db.select({ value: sql`count(distinct ${likes.jellyfinItemId})` }).from(likes).where(and(eq(likes.sessionCode, sessionCode), eq(likes.isMatch, true)));
            if ((uniqueMatches[0] as any).value >= settings.maxMatches) {
                isMatch = false; // Block match creation
            }
        }

        if (isMatch) {
            // Update ALL other users' likes for this item to be a match
            await db.update(likes)
                .set({ isMatch: true })
                .where(and(
                    eq(likes.sessionCode, sessionCode),
                    eq(likes.jellyfinItemId, body.itemId)
                ));
            
            // Notify other members of the match
            events.emit(EVENT_TYPES.MATCH_FOUND, {
              sessionCode: sessionCode,
              itemId: body.itemId,
              swiperId: session.user.Id,
              itemName: body.item?.Name || "a movie",
            });
        }
      }

      // 3. Store OUR like
      await db.insert(likes).values({
          jellyfinUserId: session.user.Id,
          jellyfinItemId: body.itemId,
          sessionCode: sessionCode, // Link to session if exists
          isMatch: isMatch, // If we found a match, we are also a match
      });
      
    } else {
      // Dislike logic (Hidden)
      if (sessionCode && settings?.maxLeftSwipes !== undefined && settings.maxLeftSwipes > 0) {
          const leftCount = await db.select({ value: count() }).from(hiddens).where(and(eq(hiddens.sessionCode, sessionCode), eq(hiddens.jellyfinUserId, session.user.Id)));
          if (leftCount[0].value >= settings.maxLeftSwipes) {
              return NextResponse.json({ error: "Left swipe limit reached" }, { status: 403 });
          }
      }

      await db.insert(hiddens).values({
          jellyfinUserId: session.user.Id,
          jellyfinItemId: body.itemId,
          sessionCode: sessionCode,
      });
    }


    // Return isMatch status so Frontend can show a "Boom!" effect
    let likedBy: any[] = [];
    if (isMatch && session.sessionCode) {
        const itemLikes = await db.query.likes.findMany({
            where: and(
                eq(likes.sessionCode, session.sessionCode),
                eq(likes.jellyfinItemId, body.itemId)
            )
        });
        const members = await db.query.sessionMembers.findMany({
            where: eq(sessionMembers.sessionCode, session.sessionCode)
        });
        likedBy = itemLikes.map(l => ({
            userId: l.jellyfinUserId,
            userName: members.find(m => m.jellyfinUserId === l.jellyfinUserId)?.jellyfinUserName || "Unknown"
        }));
    }

    return NextResponse.json({ success: true, isMatch, likedBy });


  } catch (error) {
    // Duplicate swipes are ignored
    return NextResponse.json({ success: true, isMatch: false });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: { itemId: string } = await request.json();

  try {
    const sessionCode = session.sessionCode;

    await db.delete(likes).where(
      and(
        eq(likes.jellyfinUserId, session.user.Id),
        eq(likes.jellyfinItemId, body.itemId)
      )
    );

    // If it was a session match, we might need to update other users' like.isMatch status
    if (sessionCode) {
        const s = await db.query.sessions.findFirst({
            where: eq(sessions.code, sessionCode)
        });
        const settings: SessionSettings | null = s?.settings ? JSON.parse(s.settings) : null;
        const matchStrategy = settings?.matchStrategy || "atLeastTwo";

        const remainingLikes = await db.query.likes.findMany({
            where: and(
                eq(likes.sessionCode, sessionCode),
                eq(likes.jellyfinItemId, body.itemId)
            )
        });

        const members = await db.query.sessionMembers.findMany({
            where: eq(sessionMembers.sessionCode, sessionCode)
        });
        const numMembers = members.length;

        let stillAMatch = false;
        if (matchStrategy === "atLeastTwo") {
            stillAMatch = remainingLikes.length >= 2;
        } else if (matchStrategy === "allMembers") {
            stillAMatch = remainingLikes.length >= numMembers && numMembers > 0;
        }

        if (!stillAMatch) {
            // No longer a match for anyone
            await db.update(likes)
                .set({ isMatch: false })
                .where(
                    and(
                        eq(likes.sessionCode, sessionCode),
                        eq(likes.jellyfinItemId, body.itemId)
                    )
                );
        }

        // Notify that matches might have changed
        events.emit(EVENT_TYPES.MATCH_REMOVED, {
            sessionCode: sessionCode,
            itemId: body.itemId,
            userId: session.user.Id
        });
    }

    await db.delete(hiddens).where(
      and(
        eq(hiddens.jellyfinUserId, session.user.Id),
        eq(hiddens.jellyfinItemId, body.itemId)
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete swipe" }, { status: 500 });
  }
}