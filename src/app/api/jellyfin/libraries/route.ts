import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getCachedLibraries } from "@/lib/jellyfin/cached-queries";


export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

        const libraries = await getCachedLibraries(accessToken!, deviceId!, userId!);
        
        return NextResponse.json(libraries);
    } catch (error) {

        console.error("Fetch Libraries Error", error);
        return NextResponse.json({ error: "Failed to fetch libraries" }, { status: 500 });
    }
}
