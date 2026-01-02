import { NextResponse } from "next/server";
import { GITHUB_API_URL } from "@/lib/constants";
import { getRuntimeConfig } from "@/lib/runtime-config";

export async function GET() {
    const { version: currentVersion } = getRuntimeConfig();
    try {
        const response = await fetch(`${GITHUB_API_URL}/releases/latest`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error("Failed to fetch version from GitHub");
        }

        const data = await response.json();
        return NextResponse.json({
            version: data.tag_name?.replace('v', ''),
            url: data.html_url
        });
    } catch (error) {
        console.error("Version fetch error:", error);
        return NextResponse.json({
            version: currentVersion,
            url: "https://github.com/m3sserstudi0s/swiparr"
        });
    }
}
