import { NextResponse } from "next/server";
import { GITHUB_API_URL } from "@/lib/constants";
import packageJson from "../../../../package.json";

export async function GET() {
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
            version: packageJson.version,
            url: "https://example.com"
        });
    }
}
