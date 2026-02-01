import sharp from "sharp";
import { getCache, setCache } from "./cache";
import axios from "axios";

// Limit sharp memory usage and cache
sharp.cache({ items: 50, memory: 50 }); // 50MB max cache
sharp.concurrency(2); // Limit CPU usage too

const BLUR_CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function getBlurDataURL(
    itemId: string,
    imageUrl: string,
    headers: any = {}
): Promise<string | undefined> {
    const cacheKey = `blur_${itemId}_${Buffer.from(imageUrl).toString('base64').substring(0, 32)}`;
    const cached = getCache<string>(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            headers,
            timeout: 10000,
        });

        const buffer = Buffer.from(response.data);
        const { data, info } = await sharp(buffer)
            .resize(10) // Small size for blur placeholder
            .toBuffer({ resolveWithObject: true });

        const blurDataURL = `data:image/${info.format};base64,${data.toString("base64")}`;
        
        setCache(cacheKey, blurDataURL, BLUR_CACHE_TTL);
        return blurDataURL;
    } catch (error: any) {
        console.error(`Failed to generate blurDataURL for ${itemId}:`, error.message);
        return undefined;
    }
}
