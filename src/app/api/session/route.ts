import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { v4 as uuidv4 } from "uuid";


function generateCode() {
    // Simple 4-letter code (e.g., AXYZ)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();

    // ACTION: JOIN
    if (body.action === "join") {
        const code = body.code.toUpperCase();
        const existingSession = await db.query.sessions.findFirst({
            where: eq(sessions.code, code),
        });


        if (!existingSession) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        session.sessionCode = code;
        await session.save();
        return NextResponse.json({ success: true, code });
    }

    // ACTION: CREATE
    if (body.action === "create") {
        const code = generateCode();
        await db.insert(sessions).values({
            id: uuidv4(),
            code,
            hostUserId: session.user.Id,
        });


        session.sessionCode = code;
        await session.save();
        return NextResponse.json({ success: true, code });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  return NextResponse.json({ 
    code: session.sessionCode || null 
  });
}

export async function DELETE() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.sessionCode = undefined;
    await session.save();
    return NextResponse.json({ success: true });
}