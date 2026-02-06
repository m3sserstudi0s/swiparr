import { NextRequest, NextResponse } from "next/server";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.toUpperCase();

    if (!code) {
        return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const session = await db.query.sessions.findFirst({
        where: eq(sessions.code, code),
        columns: {
            provider: true,
        }
    });

    if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ provider: session.provider });
}
