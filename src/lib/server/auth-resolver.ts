import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SessionData } from "@/types";

export class GuestKickedError extends Error {
    constructor() {
        super("Guest lending disabled");
        this.name = "GuestKickedError";
    }
}

export async function getEffectiveCredentials(session: SessionData) {
    if (!session.user?.isGuest) {
        return {
            accessToken: session.user?.AccessToken,
            deviceId: session.user?.DeviceId,
            userId: session.user?.Id
        };
    }

    if (!session.sessionCode) {
        throw new Error("Guest without session code");
    }

    const currentSession = await db.query.sessions.findFirst({
        where: eq(sessions.code, session.sessionCode)
    });

    if (!currentSession) {
        throw new Error("Session not found");
    }

    if (!currentSession.hostAccessToken) {
        throw new GuestKickedError();
    }

    return {
        accessToken: currentSession.hostAccessToken,
        deviceId: currentSession.hostDeviceId || "guest-device",
        userId: currentSession.hostUserId
    };
}
