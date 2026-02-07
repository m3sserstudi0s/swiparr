import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const ratings = await MediaService.getRatings(session);
        return NextResponse.json(ratings);
    } catch (error) {
        console.error("Fetch Ratings Error", error);
        return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
    }
}
