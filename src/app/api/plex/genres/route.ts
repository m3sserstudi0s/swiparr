import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getPlexUrl, getPlexHeaders, apiClient } from "@/lib/plex/api";
import { getEffectiveCredentials, GuestSessionExpiredError } from "@/lib/server/auth-resolver";

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

        // Collect all genres from all movie sections
        const genreSet = new Set<string>();
        
        for (const section of movieSections) {
            const genresRes = await apiClient.get(getPlexUrl(`/library/sections/${section.key}/genre`), {
                headers: getPlexHeaders(accessToken!),
            });
            
            const genres = genresRes.data.MediaContainer.Directory || [];
            genres.forEach((g: any) => genreSet.add(g.title));
        }

        // Return in Jellyfin-compatible format
        const genreList = Array.from(genreSet).map(name => ({
            Name: name,
            Id: name,
        }));

        return NextResponse.json(genreList);
    } catch (error) {
        if (error instanceof GuestSessionExpiredError) {
            session.destroy();
            return NextResponse.json({ error: "Session expired", redirect: "/login" }, { status: 401 });
        }
        console.error("Fetch Genres Error", error);
        return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
    }
}
