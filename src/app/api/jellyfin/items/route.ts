import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

import { db, likes, hiddens, sessions } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "@/lib/jellyfin/api";
import { SessionData, JellyfinItem } from "@/types/swiparr";
import { shuffleWithSeed } from "@/lib/utils";
import { getIncludedLibraries } from "@/lib/server/admin";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest) {

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

        // 0. Get admin-defined libraries
        const includedLibraries = await getIncludedLibraries();

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
            const yearsStr = sessionFilters?.yearRange 
                ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange[0] + i).join(",") 
                : undefined;

            const runtimeTicksMin = sessionFilters?.runtimeRange ? sessionFilters.runtimeRange[0] * 600000000 : undefined;
            const runtimeTicksMax = (sessionFilters?.runtimeRange && sessionFilters.runtimeRange[1] < 240) ? sessionFilters.runtimeRange[1] * 600000000 : undefined;

            const fetchAllForLibrary = async (parentId?: string) => {
                const res = await apiClient.get(getJellyfinUrl(`/Users/${userId}/Items`), {
                    params: {
                        IncludeItemTypes: "Movie",
                        Recursive: true,
                        Fields: "Id,UserData",
                        SortBy: "Id", // Deterministic starting point
                        ParentId: parentId,
                        Genres: sessionFilters?.genres?.join(",") || undefined,
                        Years: yearsStr,
                        MinCommunityRating: sessionFilters?.minCommunityRating || undefined,
                        OfficialRatings: sessionFilters?.officialRatings?.join(",") || undefined,
                        MinRunTimeTicks: runtimeTicksMin,
                        MaxRunTimeTicks: runtimeTicksMax,
                    },

                    headers: getAuthenticatedHeaders(accessToken!, deviceId!),
                });
                return res.data.Items || [];
            };

            // Fetch ALL movies (IDs + UserData) to ensure a consistent shuffle across users
            let allItems = [];
            if (includedLibraries.length > 0) {
                const results = await Promise.all(includedLibraries.map(libId => fetchAllForLibrary(libId)));
                allItems = results.flat();
            } else {
                allItems = await fetchAllForLibrary();
            }
            
            // Seeded shuffle of the entire library
            const shuffledItems = shuffleWithSeed(allItems, session.sessionCode) as JellyfinItem[];
            
            // Pick first 50 not excluded for the current user
            const targetIds = shuffledItems
                .filter((item: JellyfinItem) => !excludeIds.has(item.Id))
                .slice(0, 50)
                .map((item: JellyfinItem) => item.Id);
 
            if (targetIds.length > 0) {
                // Fetch full data for these specific IDs
                const detailRes = await apiClient.get(getJellyfinUrl(`/Users/${userId}/Items`), {
                    params: {
                        Ids: targetIds.join(","),
                        Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres",
                    },
                    headers: getAuthenticatedHeaders(accessToken!, deviceId!),
                });
                // Sort them back to the shuffled order because Jellyfin might return them in different order
                const detailItems = detailRes.data.Items || [];
                items = targetIds.map(id => detailItems.find((item: JellyfinItem) => item.Id === id)).filter((item): item is JellyfinItem => !!item);
            }
        } else {
            // SOLO MODE: Normal random
            const limitPerLib = includedLibraries.length > 0 ? Math.ceil(100 / includedLibraries.length) : 100;
            const soloYearsStr = session.soloFilters?.yearRange 
                ? Array.from({ length: session.soloFilters.yearRange[1] - session.soloFilters.yearRange[0] + 1 }, (_, i) => session.soloFilters?.yearRange && session.soloFilters?.yearRange[0] + i).join(",") 
                : undefined;
 
            const soloRuntimeTicksMin = session.soloFilters?.runtimeRange ? session.soloFilters.runtimeRange[0] * 600000000 : undefined;
            const soloRuntimeTicksMax = (session.soloFilters?.runtimeRange && session.soloFilters.runtimeRange[1] < 240) ? session.soloFilters.runtimeRange[1] * 600000000 : undefined;

            const fetchRandomForLibrary = async (parentId?: string) => {
                const res = await apiClient.get(getJellyfinUrl(`/Users/${userId}/Items`), {
                    params: {
                        IncludeItemTypes: "Movie",
                        Recursive: true,
                        SortBy: "Random",
                        Limit: limitPerLib,
                        Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres",
                        Filters: "IsUnplayed",
                        ParentId: parentId,
                        Genres: session.soloFilters?.genres?.join(",") || undefined,
                        Years: soloYearsStr,
                        MinCommunityRating: session.soloFilters?.minCommunityRating || undefined,
                        OfficialRatings: session.soloFilters?.officialRatings?.join(",") || undefined,
                        MinRunTimeTicks: soloRuntimeTicksMin,
                        MaxRunTimeTicks: soloRuntimeTicksMax,
                    },

                    headers: getAuthenticatedHeaders(accessToken!, deviceId!),
                });
                return res.data.Items || [];
            };

            if (includedLibraries.length > 0) {
                const results = await Promise.all(includedLibraries.map(libId => fetchRandomForLibrary(libId)));
                const combined = results.flat();
                items = combined.filter((item: JellyfinItem) => !excludeIds.has(item.Id)).slice(0, 50);
            } else {
                items = (await fetchRandomForLibrary()).filter((item: JellyfinItem) => !excludeIds.has(item.Id)).slice(0, 50);
            }
        }


        return NextResponse.json(items);
    } catch (error) {
        console.error("Fetch Items Error", error);
        return NextResponse.json({ error: "Failed to fetch deck" }, { status: 500 });
    }
}
