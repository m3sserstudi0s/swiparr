import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { setAdminUserId, getAdminUserId } from "@/lib/server/admin";

export async function POST() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const currentAdmin = await getAdminUserId();
    if (currentAdmin) {
        return NextResponse.json({ error: "Admin already exists" }, { status: 400 });
    }

    const success = await setAdminUserId(session.user.Id);
    if (success) {
        // Update session
        session.user.isAdmin = true;
        await session.save();
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Failed to claim admin role" }, { status: 500 });
}
