import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";
import { handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || "SE";
    const sessionCode = searchParams.get("sessionCode");
    const wantAll = searchParams.get("all") === "true";

    try {
        const result = await MediaService.getWatchProviders(session, region, sessionCode, wantAll);
        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error, "Failed to fetch watch providers");
    }
}
