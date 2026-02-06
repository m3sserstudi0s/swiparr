import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, sessions, sessionMembers } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { events, EVENT_TYPES } from "@/lib/events";

import { guestLoginSchema } from "@/lib/validations";

import { getRuntimeConfig } from "@/lib/runtime-config";

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: NextRequest) {
    const { capabilities } = getRuntimeConfig();
    try {
        const body = await request.json();
        const validated = guestLoginSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ message: "Invalid input" }, { status: 400 });
        }

        const { username, sessionCode } = validated.data;

        let code = sessionCode?.toUpperCase();
        
        if (!code && !capabilities.hasAuth) {
            // TMDB mode: Create a new session if no code provided
            code = generateCode();
            const hostId = `user-${uuidv4()}`;
            await db.insert(sessions).values({
                id: uuidv4(),
                code,
                hostUserId: hostId, 
                hostAccessToken: null,
                hostDeviceId: "guest-device",
                provider: "tmdb",
            });
            
            const cookieStore = await cookies();
            const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

            session.user = {
                Id: hostId,
                Name: username,
                AccessToken: "", 
                DeviceId: "guest-device",
                isGuest: false,
                provider: "tmdb",
            };
            session.isLoggedIn = true;
            session.sessionCode = code;
            await session.save();

            // Register as member
            await db.insert(sessionMembers).values({
                sessionCode: code,
                externalUserId: hostId,
                externalUserName: username,
            });

            events.emit(EVENT_TYPES.SESSION_UPDATED, code);
            return NextResponse.json({ success: true, user: session.user });
        }

        if (!code) {
            return NextResponse.json({ message: "Session code is required" }, { status: 400 });
        }

        const existingSession = await db.query.sessions.findFirst({
            where: eq(sessions.code, code),
        });

        if (!existingSession) {
            return NextResponse.json({ message: "Session not found" }, { status: 404 });
        }

        if (capabilities.hasAuth && !existingSession.hostAccessToken) {
            return NextResponse.json({ message: "This session does not allow guest lending" }, { status: 403 });
        }

        const isGuest = capabilities.hasAuth;
        const guestId = `${isGuest ? 'guest' : 'user'}-${uuidv4()}`;
        
        const cookieStore = await cookies();
        const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

        session.user = {
            Id: guestId,
            Name: username,
            AccessToken: "", 
            DeviceId: "guest-device",
            isGuest: isGuest,
            provider: isGuest ? undefined : (existingSession.provider || "tmdb"),
            providerConfig: existingSession.providerConfig ? JSON.parse(existingSession.providerConfig) : undefined,
        };
        session.isLoggedIn = true;
        session.sessionCode = code;
    
        await session.save();

        // Register member
        try {
            await db.insert(sessionMembers).values({
                sessionCode: code,
                externalUserId: guestId,
                externalUserName: username,
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
