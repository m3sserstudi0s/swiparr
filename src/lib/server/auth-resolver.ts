import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SessionData } from "@/types/swiparr";

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

    if (!currentSession || !currentSession.hostAccessToken) {
        throw new Error("Session or host credentials not found");
    }

    return {
        accessToken: currentSession.hostAccessToken,
        deviceId: currentSession.hostDeviceId || "guest-device",
        userId: currentSession.hostUserId
    };
}
