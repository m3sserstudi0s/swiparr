import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({});
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
}
