import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "@/lib/jellyfin/api";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

        const res = await apiClient.get(getJellyfinUrl(`/Genres`), {
            params: {
                Recursive: true,
                IncludeItemTypes: "Movie",
                UserId: userId,
            },
            headers: getAuthenticatedHeaders(accessToken!, deviceId!),
        });

        return NextResponse.json(res.data.Items || []);
    } catch (error) {
        console.error("Fetch Genres Error", error);
        return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
    }
}
