import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "@/lib/jellyfin/api";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

        const res = await apiClient.get(getJellyfinUrl(`/Users/${userId}/Views`), {
            headers: getAuthenticatedHeaders(accessToken!, deviceId!),
        });

        // Filter to only include Movie libraries
        const libraries = (res.data.Items || []).filter((lib: any) => 
            lib.CollectionType === "movies"
        );
        
        return NextResponse.json(libraries);
    } catch (error) {
        console.error("Fetch Libraries Error", error);
        return NextResponse.json({ error: "Failed to fetch libraries" }, { status: 500 });
    }
}
