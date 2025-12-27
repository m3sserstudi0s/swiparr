import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, sessionMembers } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
    if (!session.isLoggedIn || !session.sessionCode) {
        return NextResponse.json([]);
    }

    const members = await db.query.sessionMembers.findMany({
        where: eq(sessionMembers.sessionCode, session.sessionCode),
    });

    return NextResponse.json(members);
}
