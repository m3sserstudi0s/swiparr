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

    // Official ratings from items
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
}
