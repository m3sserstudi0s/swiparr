import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes, hiddens } from "@/lib/db";
import { eq, and, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData, SwipePayload } from "@/types/swiparr";


export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: SwipePayload = await request.json();
  let isMatch = false;

  try {
    if (body.direction === "right") {
      // 1. Check if we are in a session
      if (session.sessionCode) {
        // 2. Check if ANYONE else in this session liked this movie
        const existingLike = await db.query.likes.findFirst({
          where: and(
            eq(likes.sessionCode, session.sessionCode),
            eq(likes.jellyfinItemId, body.itemId),
            ne(likes.jellyfinUserId, session.user.Id)
          )
        });

        if (existingLike) {
            isMatch = true;
            // Update the OTHER user's like to be a match
            await db.update(likes)
                .set({ isMatch: true })
                .where(eq(likes.id, existingLike.id));
        }
      }

      // 3. Store OUR like
      await db.insert(likes).values({
          jellyfinUserId: session.user.Id,
          jellyfinItemId: body.itemId,
          sessionCode: session.sessionCode, // Link to session if exists
          isMatch: isMatch, // If we found a match, we are also a match
      });
      
    } else {
      // Dislike logic (Hidden)
      await db.insert(hiddens).values({
          jellyfinUserId: session.user.Id,
          jellyfinItemId: body.itemId,
          sessionCode: session.sessionCode,
      });
    }


    // Return isMatch status so Frontend can show a "Boom!" effect
    return NextResponse.json({ success: true, isMatch });

  } catch (error) {
    // Duplicate swipes are ignored
    return NextResponse.json({ success: true, isMatch: false });
  }
}