import { cacheLife, cacheTag } from "next/cache";
import { tagProvider } from "@/lib/cache-tags";
import { plexClient, getPlexUrl, getPlexHeaders } from "./api";
import { ProviderType } from "../providers/types";

export async function getCachedYears(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider(ProviderType.PLEX, "years"));

    const token = accessToken;
    const headers = getPlexHeaders(token);
    
    const sections = await getCachedLibraries(accessToken, deviceId, userId, serverUrl);
    const movieSections = sections.filter((l: any) => l.type === "movie");
    
    let allYears = new Map<number, any>();
    
    for (const section of movieSections) {
        const url = getPlexUrl(`/library/sections/${section.key}/year`, serverUrl);
        const res = await plexClient.get(url, { headers });
        const years = res.data.MediaContainer?.Directory || [];
        years.forEach((y: any) => {
            const val = parseInt(y.title);
            if (!isNaN(val)) {
                allYears.set(val, { Name: y.title, Value: val });
            }
        });
    }
    
    return Array.from(allYears.values()).sort((a, b) => b.Value - a.Value);
}

export async function getCachedGenres(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider(ProviderType.PLEX, "genres"));

    const token = accessToken;
    const headers = getPlexHeaders(token);
    
    const sections = await getCachedLibraries(accessToken, deviceId, userId, serverUrl);
    const movieSections = sections.filter((l: any) => l.type === "movie");
    
    let allGenres = new Map<string, any>();
    
    for (const section of movieSections) {
        const url = getPlexUrl(`/library/sections/${section.key}/genre`, serverUrl);
        const res = await plexClient.get(url, { headers });
        const genres = res.data.MediaContainer?.Directory || [];
        genres.forEach((g: any) => {
            const rawKey = g.fastKey || g.key;
            let normalizedKey = rawKey;
            if (typeof normalizedKey === 'string') {
                const stripped = normalizedKey.replace(/^\//, '');
                if (stripped.includes('genre=')) {
                    normalizedKey = stripped.split('genre=')[1];
                } else if (stripped.includes('/genre/')) {
                    normalizedKey = stripped.split('/genre/').pop();
                } else {
                    normalizedKey = stripped;
                }
            }
            allGenres.set(g.title, { Id: normalizedKey, Name: g.title });
        });
    }
    
    return Array.from(allGenres.values());
}

export async function getCachedLibraries(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider(ProviderType.PLEX, "libraries"));

    const token = accessToken;
    const url = getPlexUrl("/library/sections", serverUrl);
    const res = await plexClient.get(url, { headers: getPlexHeaders(token) });
    return res.data.MediaContainer?.Directory || [];
}

export async function getCachedRatings(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 86400, stale: 3600, expire: 172800 });
    cacheTag(tagProvider(ProviderType.PLEX, "ratings"));

    const token = accessToken;
    const headers = getPlexHeaders(token);
    
    const sections = await getCachedLibraries(accessToken, deviceId, userId, serverUrl);
    const movieSections = sections.filter((l: any) => l.type === "movie");
    
    let allRatings = new Set<string>();
    
    for (const section of movieSections) {
        const url = getPlexUrl(`/library/sections/${section.key}/contentRating`, serverUrl);
        const res = await plexClient.get(url, { headers });
        const ratings = res.data.MediaContainer?.Directory || [];
        ratings.forEach((r: any) => {
            if (r.title) allRatings.add(r.title);
        });
    }
    
    return Array.from(allRatings).sort();
}
