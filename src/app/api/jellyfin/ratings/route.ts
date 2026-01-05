import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getCachedRatings } from "@/lib/jellyfin/cached-queries";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

        const ratings = await getCachedRatings(accessToken!, deviceId!, userId!);
        return NextResponse.json(ratings);
    } catch (error) {
        console.error("Fetch Ratings Error", error);
        return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
    }
}

