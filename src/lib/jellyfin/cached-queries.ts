import { unstable_cache } from "next/cache";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "./api";

export const getCachedYears = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string) => {
        const res = await apiClient.get(getJellyfinUrl(`/Years`), {
            params: {
                Recursive: true,
                IncludeItemTypes: "Movie",
                UserId: userId,
            },
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });
        return res.data.Items || [];
    },
    ["jellyfin-years"],
    { revalidate: 3600 } // Cache for 1 hour
);

export const getCachedGenres = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string) => {
        const res = await apiClient.get(getJellyfinUrl(`/Genres`), {
            params: {
                Recursive: true,
                IncludeItemTypes: "Movie",
                UserId: userId,
            },
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });
        return res.data.Items || [];
    },
    ["jellyfin-genres"],
    { revalidate: 3600 }
);

export const getCachedLibraries = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string) => {
        const res = await apiClient.get(getJellyfinUrl(`/Users/${userId}/Views`), {
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });

        // Filter to only include Movie libraries
        return (res.data.Items || []).filter((lib: any) =>
            lib.CollectionType === "movies"
        );
    },
    ["jellyfin-libraries"],
    { revalidate: 3600 }
);

export const getCachedRatings = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string) => {
        // Jellyfin doesn't have a direct "ratings" endpoint, 
        // but we can get unique official ratings from items.
        // For now, we'll return a sensible default or fetch from items if needed.
        // To be performant, let's just return unique OfficialRating from all movies.
        const res = await apiClient.get(getJellyfinUrl(`/Items`), {
            params: {
                Recursive: true,
                IncludeItemTypes: "Movie",
                Fields: "OfficialRating",
                UserId: userId,
            },
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });

        const ratings = new Set<string>();
        (res.data.Items || []).forEach((item: any) => {
            if (item.OfficialRating) ratings.add(item.OfficialRating);
        });

        return Array.from(ratings).sort();
    },
    ["jellyfin-ratings"],
    { revalidate: 86400 } // Ratings change even less frequently, 24h
);
