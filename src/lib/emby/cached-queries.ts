import { unstable_cache } from "next/cache";
import { apiClient, getEmbyUrl, getAuthenticatedHeaders } from "./api";

export const getCachedYears = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string, serverUrl?: string) => {
        const res = await apiClient.get(getEmbyUrl("/Years", serverUrl), {
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });
        return res.data.Items || [];
    },
    ["emby-years"],
    { revalidate: 3600 }
);

export const getCachedGenres = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string, serverUrl?: string) => {
        const res = await apiClient.get(getEmbyUrl("/Genres", serverUrl), {
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });
        return res.data.Items || [];
    },
    ["emby-genres"],
    { revalidate: 3600 }
);

export const getCachedLibraries = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string, serverUrl?: string) => {
        const res = await apiClient.get(getEmbyUrl(`/Users/${userId}/Views`, serverUrl), {
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });
        return res.data.Items || [];
    },
    ["emby-libraries"],
    { revalidate: 3600 }
);

export const getCachedRatings = unstable_cache(
    async (accessToken: string, deviceId: string, userId: string, serverUrl?: string) => {
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
    },
    ["emby-ratings"],
    { revalidate: 86400 }
);
