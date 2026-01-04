import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes, sessionMembers, type Like } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient as jellyfinApiClient } from "@/lib/jellyfin/api";
import { getPlexUrl, getPlexHeaders, apiClient as plexApiClient } from "@/lib/plex/api";
import { SessionData, plexToUnifiedItem } from "@/types/swiparr";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getRuntimeConfig } from "@/lib/runtime-config";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  if (!session.sessionCode) return NextResponse.json([]);

  try {
    const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);
    const config = getRuntimeConfig();
    const isPlex = config.backend === 'plex';

    const matches = await db.select().from(likes)
      .where(and(
        eq(likes.sessionCode, session.sessionCode as string),
        eq(likes.isMatch, true),
      ))
      .groupBy(likes.jellyfinItemId)
      .orderBy(desc(likes.createdAt));

    if (matches.length === 0) return NextResponse.json([]);

    let items: any[];

    if (isPlex) {
      // Fetch each item individually from Plex (Plex doesn't have a bulk fetch by IDs)
      const itemPromises = matches.map(async (m: Like) => {
        try {
          const res = await plexApiClient.get(getPlexUrl(`/library/metadata/${m.jellyfinItemId}`), {
            headers: getPlexHeaders(accessToken!),
          });
          const metadata = res.data.MediaContainer.Metadata?.[0];
          return metadata ? plexToUnifiedItem(metadata) : null;
        } catch {
          return null;
        }
      });
      items = (await Promise.all(itemPromises)).filter(Boolean);
    } else {
      // Jellyfin: bulk fetch by IDs
      const ids = matches.map((m: Like) => m.jellyfinItemId).join(",");
      const jellyfinRes = await jellyfinApiClient.get(getJellyfinUrl(`/Users/${userId}/Items`), {
        params: {
          Ids: ids,
          Fields: "ProductionYear,CommunityRating,Overview",
        },
        headers: getAuthenticatedHeaders(accessToken!, deviceId!),
      });
      items = jellyfinRes.data.Items;
    }

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
