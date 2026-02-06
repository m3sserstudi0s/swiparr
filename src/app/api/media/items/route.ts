import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

import { db, likes, hiddens, sessions, sessionMembers, config as configTable } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";

import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { MediaItem } from "@/types/media";
import { shuffleWithSeed } from "@/lib/utils";
import { getIncludedLibraries } from "@/lib/server/admin";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { ProviderType } from "@/lib/providers/types";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("searchTerm") || undefined;
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "50");

    try {
        const auth = await getEffectiveCredentials(session);
        const provider = getMediaProvider(auth.provider);
        const activeProviderName = auth.provider || session.user.provider || ProviderType.JELLYFIN;
        const runtimeConfig = getRuntimeConfig();

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
            ...liked.map((l: { externalId: any; }) => l.externalId),
            ...hidden.map((h: { externalId: any; }) => h.externalId)
        ]);


        // 2. Query Media Provider
        const sessionFilters = session.sessionCode 
            ? await (async () => {
                const currentSession = await db.query.sessions.findFirst({
                    where: eq(sessions.code, session.sessionCode!)
                });
                return currentSession?.filters ? JSON.parse(currentSession.filters) : null;
              })()
            : session.soloFilters;

        // Watch Providers Logic
        let watchProviders = sessionFilters?.watchProviders;
        let watchRegion = sessionFilters?.watchRegion || auth.watchRegion || "SE";

        if (!watchProviders && activeProviderName === "tmdb") {
            const accumulated = new Set<string>();
            if (session.sessionCode) {
                const sessionMembersList = await db.query.sessionMembers.findMany({
                    where: eq(sessionMembers.sessionCode, session.sessionCode)
                });
                sessionMembersList.forEach((m: { settings: string; }) => {
                    if (m.settings) {
                        try {
                            const s = JSON.parse(m.settings);
                            if (s.watchProviders) s.watchProviders.forEach((p: string) => accumulated.add(p));
                            if (s.watchRegion) watchRegion = s.watchRegion;
                        } catch(e) {}
                    }
                });
            } else {
                const userSettingsEntry = await db.query.config.findFirst({
                    where: eq(configTable.key, `user_settings:${session.user.Id}`),
                });
                if (userSettingsEntry) {
                    try {
                        const s = JSON.parse(userSettingsEntry.value);
                        if (s.watchProviders) s.watchProviders.forEach((p: string) => accumulated.add(p));
                        if (s.watchRegion) watchRegion = s.watchRegion;
                    } catch(e) {}
                }
            }
            watchProviders = accumulated.size > 0 ? Array.from(accumulated) : undefined;
        }

        // If searchTerm is provided, we bypass normal deck logic and just search
        if (searchTerm) {
            const results = await provider.getItems({ 
                searchTerm, 
                libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
                watchProviders,
                watchRegion,
                limit: 20 
            }, auth);
            return NextResponse.json({ items: results, hasMore: false });
        }

        if (session.sessionCode) {
            // SESSION MODE: Seeded random
            
            // Fetch items from provider with filters
            // To maintain seeded shuffle, we need ALL matching item IDs.
            const allItems = await provider.getItems({
                libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
                genres: sessionFilters?.genres,
                years: sessionFilters?.yearRange ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange[0] + i) : undefined,
                ratings: sessionFilters?.officialRatings,
                minCommunityRating: sessionFilters?.minCommunityRating,
                watchProviders,
                watchRegion,
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

            // Client-side filtering for Community Rating (if not handled by provider)
            if (sessionFilters?.minCommunityRating) {
                filteredItems = filteredItems.filter(item => (item.CommunityRating || 0) >= sessionFilters.minCommunityRating);
            }
            
            // Seeded shuffle
            const shuffledItems = shuffleWithSeed(filteredItems, session.sessionCode);
            
            // Slice based on page and limit
            const slicedItems = shuffledItems.slice(page * limit, (page + 1) * limit);

            // Filter out already swiped from this slice
            const items = slicedItems.filter(item => !excludeIds.has(item.Id));

            // Enrich the first item with blur data
            if (items.length > 0) {
                items[0].BlurDataURL = await provider.getBlurDataUrl(items[0].Id, "Primary", auth);
            }

            return NextResponse.json({
                items,
                hasMore: (page + 1) * limit < shuffledItems.length
            });
        } else {
            // SOLO MODE: Normal random
            const soloYears = sessionFilters?.yearRange ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange[0] + i) : undefined;
            
            const fetchedItems = await provider.getItems({
                libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
                genres: sessionFilters?.genres,
                years: soloYears,
                ratings: sessionFilters?.officialRatings,
                minCommunityRating: sessionFilters?.minCommunityRating,
                watchProviders,
                watchRegion,
                sortBy: "Random",
                unplayedOnly: true,
                limit: limit,
                offset: page * limit
            }, auth);
            
            // Client-side filtering for Runtime in Solo mode
            let items = fetchedItems;
            if (sessionFilters?.runtimeRange) {
                const [min, max] = sessionFilters.runtimeRange;
                items = items.filter(item => {
                    const minutes = (item.RunTimeTicks || 0) / 600000000;
                    if (min && minutes < min) return false;
                    if (max && max < 240 && minutes > max) return false;
                    return true;
                });
            }

            // Client-side filtering for Community Rating in Solo mode
            if (sessionFilters?.minCommunityRating) {
                items = items.filter(item => (item.CommunityRating || 0) >= sessionFilters.minCommunityRating);
            }
            
            items = items.filter(item => !excludeIds.has(item.Id));

            if (items.length > 0) {
                items[0].BlurDataURL = await provider.getBlurDataUrl(items[0].Id, "Primary", auth);
            }

            return NextResponse.json({
                items,
                hasMore: fetchedItems.length === limit // Simple heuristic for solo mode
            });
        }

    } catch (error) {
        console.error("Fetch Items Error", error);
        return NextResponse.json({ error: "Failed to fetch deck" }, { status: 500 });
    }
}
