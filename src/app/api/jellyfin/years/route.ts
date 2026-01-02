import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import axios from "axios";
import { getJellyfinUrl, getAuthenticatedHeaders } from "@/lib/jellyfin/api";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const res = await axios.get(getJellyfinUrl(`/Years`), {
            params: {
                Recursive: true,
                IncludeItemTypes: "Movie",
                UserId: session.user.Id,
            },
            headers: getAuthenticatedHeaders(session.user.AccessToken, session.user.DeviceId),
        });

        // Years return as objects with Name (the year string)
        return NextResponse.json(res.data.Items || []);
    } catch (error) {
        console.error("Fetch Years Error", error);
        return NextResponse.json({ error: "Failed to fetch years" }, { status: 500 });
    }
}
