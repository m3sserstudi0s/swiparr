import { NextResponse } from "next/server";
import { GITHUB_REPO } from "@/lib/constants";
import { getRuntimeConfig } from "@/lib/runtime-config";

export async function GET() {
    const { version: currentVersion } = getRuntimeConfig();
    try {
        // Fetch package.json from the master branch to check for the latest version
        const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/master/package.json`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error("Failed to fetch version from GitHub");
        }

        const data = await response.json();
        const latestVersion = data.version.replace(/^v/i, '');

        return NextResponse.json({
            version: latestVersion,
            url: `https://github.com/${GITHUB_REPO}`
        });
    } catch (error) {
        console.error("Version fetch error:", error);
        return NextResponse.json({
            version: currentVersion,
            url: `https://github.com/${GITHUB_REPO}`
        });
    }
}
