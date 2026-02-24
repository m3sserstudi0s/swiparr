import "server-only";
import sharp from "sharp";
import axios from "axios";
import { cacheLife, cacheTag } from "next/cache";
import { tagBlur } from "@/lib/cache-tags";

// Limit sharp memory usage and cache
sharp.cache({ items: 50, memory: 50 }); // 50MB max cache
sharp.concurrency(2); // Limit CPU usage too

export async function getBlurDataURL(
    itemId: string,
    imageUrl: string,
    headers: any = {}
): Promise<string | undefined> {
    "use cache";
    cacheLife({ revalidate: 86400, stale: 3600, expire: 2592000 });
    cacheTag(tagBlur(itemId));
    cacheTag(tagBlur());

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
        
        return blurDataURL;
    } catch (error: any) {
        console.error(`Failed to generate blurDataURL for ${itemId}:`, error.message);
        return undefined;
    }
}
