import { NextResponse } from "next/server";
import { GITHUB_API_URL, GITHUB_REPO } from "@/lib/constants";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { logger } from "@/lib/logger";

export async function GET() {
    const { version: currentVersion } = getRuntimeConfig();
    const cacheHeaders = {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400"
    };
    try {
        // Fetch latest release tag for the most recent version
        const response = await fetch(`${GITHUB_API_URL}/releases/latest`, {
            next: { revalidate: 3600 },
            headers: {
                Accept: "application/vnd.github+json",
            }
        });

        if (!response.ok) {
            logger.warn(`GitHub version fetch failed: ${response.status} ${response.statusText}`);
            return NextResponse.json({
                version: currentVersion,
                url: `https://github.com/${GITHUB_REPO}`
            }, { headers: cacheHeaders });
        }

        const data = await response.json();
        const latestVersion = String(data.tag_name || "").replace(/^v/i, "");
        if (!latestVersion) {
            logger.warn(`GitHub release tag missing for ${GITHUB_REPO}`);
            return NextResponse.json({
                version: currentVersion,
                url: `https://github.com/${GITHUB_REPO}`
            }, { headers: cacheHeaders });
        }

        return NextResponse.json({
            version: latestVersion,
            url: `https://github.com/${GITHUB_REPO}`
        }, { headers: cacheHeaders });
    } catch (error) {
        logger.error("Version fetch error:", error);
        return NextResponse.json({
            version: currentVersion,
            url: `https://github.com/${GITHUB_REPO}`
        }, { headers: cacheHeaders });
    }
}
