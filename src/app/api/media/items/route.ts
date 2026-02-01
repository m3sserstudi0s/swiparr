import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

import { db, likes, hiddens, sessions } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";

import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { MediaItem } from "@/types/media";
import { shuffleWithSeed } from "@/lib/utils";
import { getIncludedLibraries } from "@/lib/server/admin";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";

import { getCache, setCache } from "@/lib/server/cache";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const auth = await getEffectiveCredentials(session);
        const provider = getMediaProvider();

        // 0. Get admin-defined libraries
        const includedLibraries = await getIncludedLibraries();

        // 1. Get existing interactions from DB (Likes and Hiddens)
        const [liked, hidden] = await Promise.all([
            db.select({ externalId: likes.externalId })
              .from(likes)
              .where(and(
                eq(likes.externalUserId, session.user.Id),
                session.sessionCode ? eq(likes.sessionCode, session.sessionCode) : isNull(likes.sessionCode)
              )),
            db.select({ externalId: hiddens.externalId })
              .from(hiddens)
              .where(
                session.sessionCode 
                  ? eq(hiddens.sessionCode, session.sessionCode) 
                  : and(eq(hiddens.externalUserId, session.user.Id), isNull(hiddens.sessionCode))
              )
        ]);

        const excludeIds = new Set([
            ...liked.map(l => l.externalId),
            ...hidden.map(h => h.externalId)
        ]);


        // 2. Query Media Provider
        let items: MediaItem[] = [];

        if (session.sessionCode) {
            // SESSION MODE: Seeded random
            const currentSession = await db.query.sessions.findFirst({
                where: eq(sessions.code, session.sessionCode)
            });

            const sessionFilters = currentSession?.filters ? JSON.parse(currentSession.filters) : null;
            
            // This part is still somewhat Jellyfin-specific in terms of how it fetches all items to shuffle.
            // For TMDB, we might need a different strategy.
            // For now, if it's Jellyfin, we can use the same logic but abstracted via provider.
            
            // Fetch items from provider with filters
            // To maintain seeded shuffle, we need ALL matching item IDs.
            const allItems = await provider.getItems({
                libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
                genres: sessionFilters?.genres,
                years: sessionFilters?.yearRange ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange[0] + i) : undefined,
                ratings: sessionFilters?.officialRatings,
                limit: 1000, // Fetch a large batch for shuffling
            }, auth);

            // Client-side filtering for Runtime (if not handled by provider)
            let filteredItems = allItems;
            if (sessionFilters?.runtimeRange) {
                const [min, max] = sessionFilters.runtimeRange;
                filteredItems = allItems.filter(item => {
                    const minutes = (item.RunTimeTicks || 0) / 600000000;
                    if (min && minutes < min) return false;
                    if (max && max < 240 && minutes > max) return false;
                    return true;
                });
            }
            
            // Seeded shuffle
            const shuffledItems = shuffleWithSeed(filteredItems, session.sessionCode);
            
            // Pick first 50 not excluded
            items = shuffledItems
                .filter(item => !excludeIds.has(item.Id))
                .slice(0, 50);

            // Enrich the first item with blur data
            if (items.length > 0) {
                items[0].BlurDataURL = await provider.getBlurDataUrl(items[0].Id, "Primary", auth);
            }
        } else {
            // SOLO MODE: Normal random
            const soloYears = session.soloFilters?.yearRange ? Array.from({ length: session.soloFilters.yearRange[1] - session.soloFilters.yearRange[0] + 1 }, (_, i) => session.soloFilters!.yearRange![0] + i) : undefined;
            
            items = await provider.getItems({
                libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
                genres: session.soloFilters?.genres,
                years: soloYears,
                ratings: session.soloFilters?.officialRatings,
                sortBy: "Random",
                unplayedOnly: true,
                limit: 100,
            }, auth);
            
            // Client-side filtering for Runtime in Solo mode
            if (session.soloFilters?.runtimeRange) {
                const [min, max] = session.soloFilters.runtimeRange;
                items = items.filter(item => {
                    const minutes = (item.RunTimeTicks || 0) / 600000000;
                    if (min && minutes < min) return false;
                    if (max && max < 240 && minutes > max) return false;
                    return true;
                });
            }
            
            items = items.filter(item => !excludeIds.has(item.Id)).slice(0, 50);

            if (items.length > 0) {
                items[0].BlurDataURL = await provider.getBlurDataUrl(items[0].Id, "Primary", auth);
            }
        }

        return NextResponse.json(items);

    } catch (error) {
        console.error("Fetch Items Error", error);
        return NextResponse.json({ error: "Failed to fetch deck" }, { status: 500 });
    }
}
