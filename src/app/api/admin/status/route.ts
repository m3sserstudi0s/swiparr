import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { ConfigService } from "@/lib/services/config-service";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const adminUserId = await ConfigService.getAdminUserId(session.user.provider);

    return NextResponse.json({
        hasAdmin: !!adminUserId,
        isAdmin: !session.user.isGuest && adminUserId === session.user.Id,
    });
}
