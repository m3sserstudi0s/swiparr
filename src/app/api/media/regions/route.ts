import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const auth = await getEffectiveCredentials(session);
        const provider = getMediaProvider(auth.provider);
        if (!provider.getRegions) {
            return NextResponse.json([]);
        }
        const regions = await provider.getRegions(auth);
        return NextResponse.json(regions);
    } catch (error) {
        console.error("Fetch Regions Error", error);
        return NextResponse.json({ error: "Failed to fetch regions" }, { status: 500 });
    }
}
