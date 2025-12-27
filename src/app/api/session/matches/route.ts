import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes, type Like } from "@/lib/db";
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
        Fields: "ProductionYear,CommunityRating",
      },
      headers: { "X-Emby-Token": session.user.AccessToken },
    });

    return NextResponse.json(jellyfinRes.data.Items);

  } catch (error) {
    console.error("Error fetching matches", error);
    return NextResponse.json([], { status: 500 });
  }
}
