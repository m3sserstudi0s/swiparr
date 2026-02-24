import { cacheLife, cacheTag } from "next/cache";
import { tagProvider } from "@/lib/cache-tags";
import { apiClient, getEmbyUrl, getAuthenticatedHeaders } from "./api";

export async function getCachedYears(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider("emby", "years"));

    const res = await apiClient.get(getEmbyUrl("/Years", serverUrl), {
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });
    return res.data.Items || [];
}

export async function getCachedGenres(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider("emby", "genres"));

    const res = await apiClient.get(getEmbyUrl("/Genres", serverUrl), {
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });
    return res.data.Items || [];
}

export async function getCachedLibraries(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 3600, stale: 300, expire: 86400 });
    cacheTag(tagProvider("emby", "libraries"));

    const res = await apiClient.get(getEmbyUrl(`/Users/${userId}/Views`, serverUrl), {
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });
    return res.data.Items || [];
}

export async function getCachedRatings(accessToken: string, deviceId: string, userId: string, serverUrl?: string) {
    "use cache";
    cacheLife({ revalidate: 86400, stale: 3600, expire: 172800 });
    cacheTag(tagProvider("emby", "ratings"));

    const res = await apiClient.get(getEmbyUrl("/Items", serverUrl), {
        params: {
            IncludeItemTypes: "Movie",
            Recursive: true,
            Fields: "OfficialRating",
            EnableImages: false,
        },
        headers: getAuthenticatedHeaders(accessToken, deviceId),
    });
    return res.data.Items || [];
}
