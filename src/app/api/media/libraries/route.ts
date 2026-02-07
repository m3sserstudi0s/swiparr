import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const libraries = await MediaService.getLibraries(session);
        return NextResponse.json(libraries);
    } catch (error) {
        console.error("Fetch Libraries Error", error);
        return NextResponse.json({ error: "Failed to fetch libraries" }, { status: 500 });
    }
}
