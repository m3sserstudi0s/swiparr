import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

import { db, likes, hiddens, sessions } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

import axios from "axios";
import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl } from "@/lib/jellyfin/api";
import { SessionData, JellyfinItem } from "@/types/swiparr";
import { shuffleWithSeed } from "@/lib/utils";

export async function GET(request: NextRequest) {

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // 1. Get existing interactions from DB (Likes and Hiddens)
        // Solo: Only MY interactions. Session: MY likes, ANYONE'S hidden.
        const [liked, hidden] = await Promise.all([
            db.select({ jellyfinItemId: likes.jellyfinItemId })
              .from(likes)
              .where(and(
                eq(likes.jellyfinUserId, session.user.Id),
                session.sessionCode ? eq(likes.sessionCode, session.sessionCode) : isNull(likes.sessionCode)
              )),
            db.select({ jellyfinItemId: hiddens.jellyfinItemId })
              .from(hiddens)
              .where(
                session.sessionCode 
                  ? eq(hiddens.sessionCode, session.sessionCode) 
                  : and(eq(hiddens.jellyfinUserId, session.user.Id), isNull(hiddens.sessionCode))
              )
        ]);

        const excludeIds = new Set([
            ...liked.map(l => l.jellyfinItemId),
            ...hidden.map(h => h.jellyfinItemId)
        ]);


        // 2. Query Jellyfin
        let items: JellyfinItem[] = [];

        if (session.sessionCode) {
            // SESSION MODE: Seeded random
            // Fetch session to get filters
            const currentSession = await db.query.sessions.findFirst({
                where: eq(sessions.code, session.sessionCode)
            });

            const sessionFilters = currentSession?.filters ? JSON.parse(currentSession.filters) : null;

            // Fetch ALL movies (IDs + UserData) to ensure a consistent shuffle across users
            const allRes = await axios.get(getJellyfinUrl(`/Users/${session.user.Id}/Items`), {
                params: {
                    IncludeItemTypes: "Movie",
                    Recursive: true,
                    Fields: "Id,UserData",
                    SortBy: "Id", // Deterministic starting point
                    Genres: sessionFilters?.genres?.join(",") || undefined,
                    Years: sessionFilters?.yearRange 
                        ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange[0] + i).join(",") 
                        : undefined,
                    MinCommunityRating: sessionFilters?.minCommunityRating || undefined,
                },
                headers: { "X-Emby-Token": session.user.AccessToken },
            });

            const allItems = allRes.data.Items || [];
            
            // Seeded shuffle of the entire library
            const shuffledItems = shuffleWithSeed(allItems, session.sessionCode) as JellyfinItem[];
            
            // Pick first 50 not excluded for the current user
            const targetIds = shuffledItems
                .filter((item: JellyfinItem) => !excludeIds.has(item.Id))
                .slice(0, 50)
                .map((item: JellyfinItem) => item.Id);

            if (targetIds.length > 0) {
                // Fetch full data for these specific IDs
                const detailRes = await axios.get(getJellyfinUrl(`/Users/${session.user.Id}/Items`), {
                    params: {
                        Ids: targetIds.join(","),
                        Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres",
                    },
                    headers: { "X-Emby-Token": session.user.AccessToken },
                });
                // Sort them back to the shuffled order because Jellyfin might return them in different order
                const detailItems = detailRes.data.Items || [];
                items = targetIds.map(id => detailItems.find((item: JellyfinItem) => item.Id === id)).filter((item): item is JellyfinItem => !!item);
            }
        } else {
            // SOLO MODE: Normal random
            const jellyfinRes = await axios.get(getJellyfinUrl(`/Users/${session.user.Id}/Items`), {
                params: {
                    IncludeItemTypes: "Movie",
                    Recursive: true,
                    SortBy: "Random",
                    Limit: 100,
                    Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres",
                    Filters: "IsUnplayed",
                    Genres: session.soloFilters?.genres?.join(",") || undefined,
                    Years: session.soloFilters?.yearRange 
                        ? Array.from({ length: session.soloFilters.yearRange[1] - session.soloFilters.yearRange[0] + 1 }, (_, i) => session.soloFilters?.yearRange && session.soloFilters?.yearRange[0] + i).join(",") 
                        : undefined,
                    MinCommunityRating: session.soloFilters?.minCommunityRating || undefined,
                },
                headers: { "X-Emby-Token": session.user.AccessToken },
            });
            items = (jellyfinRes.data.Items || []).filter((item: JellyfinItem) => !excludeIds.has(item.Id)).slice(0, 50);
        }


        return NextResponse.json(items);
    } catch (error) {
        console.error("Fetch Items Error", error);
        return NextResponse.json({ error: "Failed to fetch deck" }, { status: 500 });
    }
}
