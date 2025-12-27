import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes, sessionMembers, type Like } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { getJellyfinUrl } from "@/lib/jellyfin/api";
import axios from "axios";
import { SessionData } from "@/types/swiparr";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  if (!session.sessionCode) return NextResponse.json([]);

  try {
    const matches = await db.select().from(likes)
      .where(and(
        eq(likes.sessionCode, session.sessionCode as string),
        eq(likes.isMatch, true),
      ))
      .groupBy(likes.jellyfinItemId)
      .orderBy(desc(likes.createdAt));

    if (matches.length === 0) return NextResponse.json([]);

    const ids = matches.map((m: Like) => m.jellyfinItemId).join(",");
    
    const jellyfinRes = await axios.get(getJellyfinUrl(`/Items`), {
      params: {
        Ids: ids,
        Fields: "ProductionYear,CommunityRating,Overview",
      },
      headers: { "X-Emby-Token": session.user.AccessToken },
    });

    const items = jellyfinRes.data.Items;

    // Fetch all likes for these items in this session to know who liked what
    const allLikesInSession = await db.query.likes.findMany({
        where: and(
            eq(likes.sessionCode, session.sessionCode as string),
        )
    });

    // Map likes to items
    const itemsWithLikes = items.map((item: any) => {
        const itemLikes = allLikesInSession.filter(l => l.jellyfinItemId === item.Id);
        return {
            ...item,
            likedBy: itemLikes.map(l => ({
                userId: l.jellyfinUserId,
                // We don't have the username in the likes table, 
                // but we should! Let's assume we can get it from sessionMembers 
                // OR we just show avatars for now.
                // Re-reading schema: likes table doesn't have username.
                // I should have added it to likes too, or join with sessionMembers.
            }))
        };
    });

    // To get usernames, let's also fetch session members
    const members = await db.query.sessionMembers.findMany({
        where: eq(sessionMembers.sessionCode, session.sessionCode as string)
    });

    const finalItems = itemsWithLikes.map((item: any) => ({
        ...item,
        likedBy: item.likedBy.map((lb: any) => ({
            ...lb,
            userName: members.find(m => m.jellyfinUserId === lb.userId)?.jellyfinUserName || "Unknown"
        }))
    }));

    return NextResponse.json(finalItems);

  } catch (error) {
    console.error("Error fetching matches", error);
    return NextResponse.json([], { status: 500 });
  }
}
