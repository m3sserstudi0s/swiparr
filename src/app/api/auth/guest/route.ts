import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, sessions, sessionMembers } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { events, EVENT_TYPES } from "@/lib/events";

import { guestLoginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = guestLoginSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ message: "Invalid input" }, { status: 400 });
        }

        const { username, sessionCode } = validated.data;


        const code = sessionCode.toUpperCase();
        const existingSession = await db.query.sessions.findFirst({
            where: eq(sessions.code, code),
        });

        if (!existingSession) {
            return NextResponse.json({ message: "Session not found" }, { status: 404 });
        }

        if (!existingSession.hostAccessToken) {
            return NextResponse.json({ message: "This session does not allow guest lending" }, { status: 403 });
        }

        const guestId = `guest-${uuidv4()}`;
        
        const cookieStore = await cookies();
        const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

        session.user = {
            Id: guestId,
            Name: username,
            AccessToken: "", // Guests don't have their own token
            DeviceId: "guest-device",
            isGuest: true,
        };
        session.isLoggedIn = true;
        session.sessionCode = code;
    
        await session.save();

        // Register guest as member
        try {
            await db.insert(sessionMembers).values({
                sessionCode: code,
                jellyfinUserId: guestId,
                jellyfinUserName: username,
            }).onConflictDoNothing();
        } catch (e) {
            // Ignore if already member
        }

        events.emit(EVENT_TYPES.SESSION_UPDATED, code);

        return NextResponse.json({ success: true, user: session.user });

  } catch (error) {
    console.error("[Guest Auth] Failed:", error);
    return NextResponse.json(
      { message: "Failed to join as guest" },
      { status: 500 }
    );
  }
}
