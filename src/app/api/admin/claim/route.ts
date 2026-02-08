import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { ConfigService } from "@/lib/services/config-service";

export async function POST() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.isGuest) {
        return NextResponse.json({ error: "Guests cannot claim admin role" }, { status: 403 });
    }

    const currentAdmin = await ConfigService.getAdminUserId(session.user.provider);
    if (currentAdmin) {
        return NextResponse.json({ error: "Admin already exists" }, { status: 400 });
    }

    try {
        await ConfigService.setAdminUserId(session.user.Id, session.user.provider as any);
        session.user.isAdmin = true;
        await session.save();
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to claim admin role" }, { status: 500 });
    }
}
