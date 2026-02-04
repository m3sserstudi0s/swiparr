import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { getAdminUserId } from "@/lib/server/admin";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const adminUserId = await getAdminUserId();

    return NextResponse.json({
        hasAdmin: !!adminUserId,
        isAdmin: adminUserId === session.user.Id,
    });
}
