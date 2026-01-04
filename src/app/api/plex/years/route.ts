import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getPlexUrl, getPlexHeaders, apiClient } from "@/lib/plex/api";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { accessToken } = await getEffectiveCredentials(session);

        // First get all movie library sections
        const sectionsRes = await apiClient.get(getPlexUrl('/library/sections'), {
            headers: getPlexHeaders(accessToken!),
        });

        const movieSections = sectionsRes.data.MediaContainer.Directory?.filter(
            (s: any) => s.type === 'movie'
        ) || [];

        // Collect all years from all movie sections
        const yearSet = new Set<number>();
        
        for (const section of movieSections) {
            const yearsRes = await apiClient.get(getPlexUrl(`/library/sections/${section.key}/year`), {
                headers: getPlexHeaders(accessToken!),
            });
            
            const years = yearsRes.data.MediaContainer.Directory || [];
            years.forEach((y: any) => {
                const year = parseInt(y.title);
                if (!isNaN(year)) yearSet.add(year);
            });
        }

        // Return in Jellyfin-compatible format
        const yearList = Array.from(yearSet)
            .sort((a, b) => b - a)
            .map(year => ({
                Name: year.toString(),
                Id: year.toString(),
            }));

        return NextResponse.json(yearList);
    } catch (error) {
        console.error("Fetch Years Error", error);
        return NextResponse.json({ error: "Failed to fetch years" }, { status: 500 });
    }
}
