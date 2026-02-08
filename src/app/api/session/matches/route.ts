import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, likes, sessionMembers } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  if (!session.sessionCode) return NextResponse.json([]);

  try {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);

    const matches = await db.select().from(likes)
      .where(and(
        eq(likes.sessionCode, session.sessionCode as string),
        eq(likes.isMatch, true),
      ))
      .groupBy(likes.externalId)
      .orderBy(desc(likes.createdAt));

    if (matches.length === 0) return NextResponse.json([]);

    const ids = matches.map((m: any) => m.externalId);
    
    const itemsPromises = ids.map(async (id: any) => {
        try {
            return await provider.getItemDetails(id, auth);
        } catch (error) {
            return null;
        }
    });

    const itemsResult = await Promise.all(itemsPromises);
    const items = itemsResult.filter((item): item is any => item !== null);

    const [allLikesInSession, members] = await Promise.all([
        db.select().from(likes).where(eq(likes.sessionCode, session.sessionCode as string)),
        db.select().from(sessionMembers).where(eq(sessionMembers.sessionCode, session.sessionCode as string))
    ]);

    const finalItems = items.map((item: any) => {
        const itemLikes = allLikesInSession.filter((l: any) => l.externalId === item.Id);
        return {
            ...item,
            likedBy: itemLikes.map((lb: any) => ({
                userId: lb.externalUserId,
                userName: members.find((m: any) => m.externalUserId === lb.externalUserId)?.externalUserName || "Unknown"
            }))
        };
    });

    return NextResponse.json(finalItems);

  } catch (error) {
    console.error("Error fetching matches", error);
    return NextResponse.json([], { status: 500 });
  }
}
