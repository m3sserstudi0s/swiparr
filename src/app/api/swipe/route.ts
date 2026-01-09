import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes, hiddens, sessionMembers, sessions } from "@/lib/db";
import { eq, and, ne, count, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData, SwipePayload, SessionSettings } from "@/types";
import { events, EVENT_TYPES } from "@/lib/events";


import { swipeSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {

    const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bodyRaw = await request.json();
  const validated = swipeSchema.safeParse(bodyRaw);
  if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  
  const body = validated.data;
  let isMatch = false;
  let matchBlockedByLimit = false;

  try {
    const sessionCode = body.sessionCode !== undefined ? body.sessionCode : session.sessionCode;
    let settings: SessionSettings | null = null;
    
    // Fetch session and other data in parallel
    const [sessionData, rightSwipeCount, totalMatchCount] = await Promise.all([
        sessionCode ? db.query.sessions.findFirst({ where: eq(sessions.code, sessionCode) }) : Promise.resolve(null),
        (sessionCode && body.direction === "right") ? db.select({ value: count() }).from(likes).where(and(eq(likes.sessionCode, sessionCode), eq(likes.jellyfinUserId, session.user.Id))) : Promise.resolve(null),
        (sessionCode && body.direction === "right") ? db.select({ value: sql<number>`count(distinct ${likes.jellyfinItemId})` }).from(likes).where(and(eq(likes.sessionCode, sessionCode), eq(likes.isMatch, true))) : Promise.resolve(null)
    ]);

    if (sessionData?.settings) {
        settings = JSON.parse(sessionData.settings);
    }

    if (body.direction === "right") {
      // Check right swipe limit
      if (settings?.maxRightSwipes && rightSwipeCount && rightSwipeCount[0].value >= settings.maxRightSwipes) {
          return NextResponse.json({ error: "Right swipe limit reached" }, { status: 403 });
      }

      // Check max matches limit (informational/policy)
      // Note: we'll check again before actually marking a match

      // 1. Check if we are in a session
      if (sessionCode) {
        const [members, existingLikes] = await Promise.all([
            db.query.sessionMembers.findMany({ where: eq(sessionMembers.sessionCode, sessionCode) }),
            db.query.likes.findMany({
                where: and(
                    eq(likes.sessionCode, sessionCode),
                    eq(likes.jellyfinItemId, body.itemId),
                    ne(likes.jellyfinUserId, session.user.Id)
                )
            })
        ]);

        const numMembers = members.length;
        const matchStrategy = settings?.matchStrategy || "atLeastTwo";
        
        if (matchStrategy === "atLeastTwo") {
            if (existingLikes.length > 0) isMatch = true;
        } else if (matchStrategy === "allMembers") {
            if (existingLikes.length >= numMembers - 1 && numMembers > 1) isMatch = true;
        }

        // Check max matches limit again if we are about to create a match
        if (isMatch && settings?.maxMatches && totalMatchCount && (totalMatchCount[0] as any).value >= settings.maxMatches) {
            isMatch = false; // Block match creation
            matchBlockedByLimit = true;
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
          sessionCode: sessionCode,
          isMatch: isMatch,
      });

      if (sessionCode && !isMatch) {
        // Notify other members of the like (even if not a match yet, to update contributor lists)
        events.emit(EVENT_TYPES.LIKE_UPDATED, {
          sessionCode: sessionCode,
          itemId: body.itemId,
          userId: session.user.Id,
        });
      }
      
    } else {
      // Dislike logic (Hidden)
      const leftSwipeCount = sessionCode ? await db.select({ value: count() }).from(hiddens).where(and(eq(hiddens.sessionCode, sessionCode), eq(hiddens.jellyfinUserId, session.user.Id))) : null;

      if (settings?.maxLeftSwipes && leftSwipeCount && leftSwipeCount[0].value >= settings.maxLeftSwipes) {
          return NextResponse.json({ error: "Left swipe limit reached" }, { status: 403 });
      }

      await db.insert(hiddens).values({
          jellyfinUserId: session.user.Id,
          jellyfinItemId: body.itemId,
          sessionCode: sessionCode,
      });
    }

    // Return isMatch status so Frontend can show a "Boom!" effect
    let likedBy: any[] = [];
    if (isMatch && sessionCode) {
        const [itemLikes, members] = await Promise.all([
            db.query.likes.findMany({
                where: and(
                    eq(likes.sessionCode, sessionCode),
                    eq(likes.jellyfinItemId, body.itemId)
                )
            }),
            db.query.sessionMembers.findMany({
                where: eq(sessionMembers.sessionCode, sessionCode)
            })
        ]);

        likedBy = itemLikes.map(l => ({
            userId: l.jellyfinUserId,
            userName: members.find(m => m.jellyfinUserId === l.jellyfinUserId)?.jellyfinUserName || "Unknown"
        }));
    }

    return NextResponse.json({ success: true, isMatch, likedBy, matchBlockedByLimit });



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
        const [s, remainingLikes, members] = await Promise.all([
            db.query.sessions.findFirst({ where: eq(sessions.code, sessionCode) }),
            db.query.likes.findMany({
                where: and(
                    eq(likes.sessionCode, sessionCode),
                    eq(likes.jellyfinItemId, body.itemId)
                )
            }),
            db.query.sessionMembers.findMany({ where: eq(sessionMembers.sessionCode, sessionCode) })
        ]);

        const settings: SessionSettings | null = s?.settings ? JSON.parse(s.settings) : null;
        const matchStrategy = settings?.matchStrategy || "atLeastTwo";
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