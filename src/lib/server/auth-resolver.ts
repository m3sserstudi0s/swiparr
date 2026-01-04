import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SessionData } from "@/types/swiparr";

// Custom error class to signal guest should be logged out
export class GuestSessionExpiredError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GuestSessionExpiredError";
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
        throw new GuestSessionExpiredError("Guest without session code");
    }

    const currentSession = await db.query.sessions.findFirst({
        where: eq(sessions.code, session.sessionCode)
    });

    if (!currentSession) {
        console.error("[Auth Resolver] Session not found:", session.sessionCode);
        throw new GuestSessionExpiredError("Session no longer exists");
    }
    
    if (!currentSession.hostAccessToken) {
        console.error("[Auth Resolver] No hostAccessToken for session:", session.sessionCode, "hostUserId:", currentSession.hostUserId);
        throw new GuestSessionExpiredError("Guest lending not enabled for this session");
    }

    return {
        accessToken: currentSession.hostAccessToken,
        deviceId: currentSession.hostDeviceId || "guest-device",
        userId: currentSession.hostUserId
    };
}
