import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getPlexUrl, getPlexHeaders, apiClient } from "@/lib/plex/api";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { accessToken } = await getEffectiveCredentials(session);

        const res = await apiClient.get(getPlexUrl('/library/sections'), {
            headers: getPlexHeaders(accessToken!),
        });

        // Filter to only include Movie libraries
        // Map to Jellyfin-compatible format
        const libraries = (res.data.MediaContainer.Directory || [])
            .filter((lib: any) => lib.type === 'movie')
            .map((lib: any) => ({
                Id: lib.key,
                Name: lib.title,
                CollectionType: 'movies',
                Type: lib.type,
            }));
        
        return NextResponse.json(libraries);
    } catch (error) {
        console.error("Fetch Libraries Error", error);
        return NextResponse.json({ error: "Failed to fetch libraries" }, { status: 500 });
    }
}
