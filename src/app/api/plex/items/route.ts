import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

import { db, likes, hiddens, sessions } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

import { sessionOptions } from "@/lib/session";
import { getPlexUrl, getPlexHeaders, apiClient } from "@/lib/plex/api";
import { SessionData, PlexMetadata, plexToUnifiedItem, JellyfinItem } from "@/types/swiparr";
import { shuffleWithSeed } from "@/lib/utils";
import { getIncludedLibraries } from "@/lib/server/admin";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest) {

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { accessToken } = await getEffectiveCredentials(session);

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


        // 2. Query Plex
        let items: JellyfinItem[] = [];

        if (session.sessionCode) {
            // SESSION MODE: Seeded random
            // Fetch session to get filters
            const currentSession = await db.query.sessions.findFirst({
                where: eq(sessions.code, session.sessionCode)
            });

            const sessionFilters = currentSession?.filters ? JSON.parse(currentSession.filters) : null;

            const fetchAllForLibrary = async (sectionKey?: string) => {
                // If no specific section, get all movie sections first
                if (!sectionKey) {
                    const sectionsRes = await apiClient.get(getPlexUrl('/library/sections'), {
                        headers: getPlexHeaders(accessToken!),
                    });
                    const movieSections = sectionsRes.data.MediaContainer.Directory?.filter(
                        (s: any) => s.type === 'movie'
                    ) || [];
                    
                    const allItems: PlexMetadata[] = [];
                    for (const section of movieSections) {
                        const sectionItems = await fetchAllForLibrary(section.key);
                        allItems.push(...sectionItems);
                    }
                    return allItems;
                }

                const res = await apiClient.get(getPlexUrl(`/library/sections/${sectionKey}/all`), {
                    params: {
                        type: 1, // Movie type
                        includeGuids: 1,
                    },
                    headers: getPlexHeaders(accessToken!),
                });
                
                let plexItems: PlexMetadata[] = res.data.MediaContainer.Metadata || [];
                
                // Apply filters
                if (sessionFilters?.genres?.length) {
                    plexItems = plexItems.filter(item => 
                        item.Genre?.some(g => sessionFilters.genres.includes(g.tag))
                    );
                }
                if (sessionFilters?.yearRange) {
                    plexItems = plexItems.filter(item => 
                        item.year && 
                        item.year >= sessionFilters.yearRange[0] && 
                        item.year <= sessionFilters.yearRange[1]
                    );
                }
                if (sessionFilters?.minCommunityRating) {
                    plexItems = plexItems.filter(item => 
                        (item.audienceRating || item.rating || 0) >= sessionFilters.minCommunityRating
                    );
                }
                
                return plexItems;
            };

            // Fetch ALL movies to ensure a consistent shuffle across users
            let allPlexItems: PlexMetadata[] = [];
            if (includedLibraries.length > 0) {
                for (const libKey of includedLibraries) {
                    const libItems = await fetchAllForLibrary(libKey);
                    allPlexItems.push(...libItems);
                }
            } else {
                allPlexItems = await fetchAllForLibrary();
            }
            
            // Convert to unified format
            const allItems = allPlexItems.map(plexToUnifiedItem);
            
            // Seeded shuffle of the entire library
            const shuffledItems = shuffleWithSeed(allItems, session.sessionCode) as JellyfinItem[];
            
            // Pick first 50 not excluded for the current user
            items = shuffledItems
                .filter((item: JellyfinItem) => !excludeIds.has(item.Id))
                .slice(0, 50);
        } else {
            // SOLO MODE: Random selection
            const limitPerLib = includedLibraries.length > 0 ? Math.ceil(100 / includedLibraries.length) : 100;

            const fetchRandomForLibrary = async (sectionKey?: string) => {
                // If no specific section, get all movie sections first
                if (!sectionKey) {
                    const sectionsRes = await apiClient.get(getPlexUrl('/library/sections'), {
                        headers: getPlexHeaders(accessToken!),
                    });
                    const movieSections = sectionsRes.data.MediaContainer.Directory?.filter(
                        (s: any) => s.type === 'movie'
                    ) || [];
                    
                    const allItems: PlexMetadata[] = [];
                    for (const section of movieSections) {
                        const sectionItems = await fetchRandomForLibrary(section.key);
                        allItems.push(...sectionItems);
                    }
                    return allItems;
                }

                // Build filter params for Plex
                const params: Record<string, any> = {
                    type: 1, // Movie type
                    sort: 'random',
                    'X-Plex-Container-Start': 0,
                    'X-Plex-Container-Size': limitPerLib,
                };
                
                // Apply solo filters if present
                if (session.soloFilters?.genres?.length) {
                    params.genre = session.soloFilters.genres.join(',');
                }
                if (session.soloFilters?.yearRange) {
                    params['year>'] = session.soloFilters.yearRange[0];
                    params['year<'] = session.soloFilters.yearRange[1];
                }
                if (session.soloFilters?.minCommunityRating) {
                    params['audienceRating>'] = session.soloFilters.minCommunityRating;
                }
                // Filter to unwatched only
                params.unwatched = 1;

                const res = await apiClient.get(getPlexUrl(`/library/sections/${sectionKey}/all`), {
                    params,
                    headers: getPlexHeaders(accessToken!),
                });
                
                return res.data.MediaContainer.Metadata || [];
            };

            let allPlexItems: PlexMetadata[] = [];
            if (includedLibraries.length > 0) {
                for (const libKey of includedLibraries) {
                    const libItems = await fetchRandomForLibrary(libKey);
                    allPlexItems.push(...libItems);
                }
            } else {
                allPlexItems = await fetchRandomForLibrary();
            }
            
            // Convert and filter
            items = allPlexItems
                .map(plexToUnifiedItem)
                .filter((item: JellyfinItem) => !excludeIds.has(item.Id))
                .slice(0, 50);
        }


        return NextResponse.json(items);
    } catch (error) {
        console.error("Fetch Items Error", error);
        return NextResponse.json({ error: "Failed to fetch deck" }, { status: 500 });
    }
}
