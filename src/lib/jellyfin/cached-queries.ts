import { cacheLife, cacheTag } from "next/cache";
import { tagProvider } from "@/lib/cache-tags";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "./api";
import { ProviderType } from "../providers/types";

export async function getCachedYears(accessToken: string, deviceId: string, userId: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider(ProviderType.JELLYFIN, "years"));

    const res = await apiClient.get(getJellyfinUrl(`/Years`), {
        params: {
            Recursive: true,
            IncludeItemTypes: "Movie",
            UserId: userId,
            Limit: 500,
            SortBy: "SortName",
            SortOrder: "Descending",
        },
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });
    return res.data.Items || [];
}

export async function getCachedGenres(accessToken: string, deviceId: string, userId: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider(ProviderType.JELLYFIN, "genres"));

    const res = await apiClient.get(getJellyfinUrl(`/Genres`), {
        params: {
            Recursive: true,
            IncludeItemTypes: "Movie",
            UserId: userId,
            Limit: 500,
        },
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });
    return res.data.Items || [];
}

export async function getCachedLibraries(accessToken: string, deviceId: string, userId: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider(ProviderType.JELLYFIN, "libraries"));

    const res = await apiClient.get(getJellyfinUrl(`/Users/${userId}/Views`), {
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });

    // Filter to only include Movie libraries
    return (res.data.Items || []).filter((lib: any) =>
        lib.CollectionType === "movies"
    );
}

export async function getCachedRatings(accessToken: string, deviceId: string, userId: string) {
    "use cache";
    cacheLife({ revalidate: 86400, stale: 3600, expire: 172800 });
    cacheTag(tagProvider(ProviderType.JELLYFIN, "ratings"));

    // Use /Items/Filters2 to get all distinct ContentRatings in a single fast query.
    // This is far more efficient than scanning /Items with a Limit and extracting
    // OfficialRating in JS, which would miss ratings beyond the page size.
    const res = await apiClient.get(getJellyfinUrl(`/Items/Filters2`), {
        params: {
            UserId: userId,
            IncludeItemTypes: "Movie",
            Recursive: true,
        },
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });

    // Response shape: { Genres: [...], Tags: [...], OfficialRatings: [...], Years: [...] }
    // OfficialRatings is an array of strings in Jellyfin 10.x
    return (res.data.OfficialRatings || []).sort() as string[];
}
