import sharp from "sharp";
import { getCache, setCache } from "./cache";
import { apiClient, getAuthenticatedHeaders, getJellyfinUrl } from "../jellyfin/api";

const BLUR_CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function getBlurDataURL(
    itemId: string,
    accessToken: string,
    deviceId: string,
    imageType: string = "Primary"
): Promise<string | undefined> {
    const cacheKey = `blur_${itemId}_${imageType}`;
    const cached = getCache<string>(cacheKey);
    if (cached) return cached;

    try {
        const imageUrl = getJellyfinUrl(`/Items/${itemId}/Images/${imageType}?maxWidth=20&quality=50`);
        
        const response = await apiClient.get(imageUrl, {
            responseType: "arraybuffer",
            headers: getAuthenticatedHeaders(accessToken, deviceId),
        });

        const buffer = Buffer.from(response.data);
        const { data, info } = await sharp(buffer)
            .resize(10) // Small size for blur placeholder
            .toBuffer({ resolveWithObject: true });

        const blurDataURL = `data:image/${info.format};base64,${data.toString("base64")}`;
        
        setCache(cacheKey, blurDataURL, BLUR_CACHE_TTL);
        return blurDataURL;
    } catch (error) {
        console.error(`Failed to generate blurDataURL for ${itemId}:`, error);
        return undefined;
    }
}
