import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes as likesTable, type Like } from "@/lib/db";
import { eq, and, isNotNull, isNull, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { getJellyfinUrl } from "@/lib/jellyfin/api";
import axios from "axios";
import { SessionData, type JellyfinItem, type MergedLike } from "@/types/swiparr";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "date";
  const filter = searchParams.get("filter") || "all";

  try {
    const conditions = [eq(likesTable.jellyfinUserId, session.user.Id)];

    if (filter === "session") {
        conditions.push(isNotNull(likesTable.sessionCode));
    } else if (filter === "solo") {
        conditions.push(isNull(likesTable.sessionCode));
    }

    const likesResult = await db.select().from(likesTable)
        .where(and(...conditions))
        .orderBy(desc(likesTable.createdAt));

    if (likesResult.length === 0) return NextResponse.json([]);

    const ids = likesResult.map((l: Like) => l.jellyfinItemId).join(",");
    const jellyfinRes = await axios.get(getJellyfinUrl(`/Items`), {
        params: {
            Ids: ids,
            Fields: "ProductionYear,CommunityRating",
        },
        headers: { "X-Emby-Token": session.user.AccessToken },
    });

    const items: JellyfinItem[] = jellyfinRes.data.Items;

    let merged: MergedLike[] = items.map((item: JellyfinItem) => {
        const likeData = likesResult.find((l: Like) => l.jellyfinItemId === item.Id);
        return {
            ...item,
            swipedAt: likeData?.createdAt,
            sessionCode: likeData?.sessionCode,
            isMatch: likeData?.isMatch ?? false
        };
    });

    if (sortBy === "year") {
        merged.sort((a, b) => (b.ProductionYear || 0) - (a.ProductionYear || 0));
    } else if (sortBy === "rating") {
        merged.sort((a, b) => (b.CommunityRating || 0) - (a.CommunityRating || 0));
    } else {
        merged.sort((a, b) => {
            const dateA = a.swipedAt ? new Date(a.swipedAt).getTime() : 0;
            const dateB = b.swipedAt ? new Date(b.swipedAt).getTime() : 0;
            return dateB - dateA;
        });
    }

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Fetch User Likes Error", error);
    return NextResponse.json([], { status: 500 });
  }
}
