import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const adminUserId = await ConfigService.getAdminUserId(session.user.provider);
    const isAdmin = await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest);

    return NextResponse.json({
        hasAdmin: !!adminUserId,
        isAdmin: isAdmin,
    });
}
