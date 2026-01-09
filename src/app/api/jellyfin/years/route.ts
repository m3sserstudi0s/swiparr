import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getCachedYears } from "@/lib/jellyfin/cached-queries";


export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

        const years = await getCachedYears(accessToken!, deviceId!, userId!);
        return NextResponse.json(years);
    } catch (error) {

        console.error("Fetch Years Error", error);
        return NextResponse.json({ error: "Failed to fetch years" }, { status: 500 });
    }
}
