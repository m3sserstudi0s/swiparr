import { db, sessions, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SessionData } from "@/types";
import { getRuntimeConfig } from "@/lib/runtime-config";

export class GuestKickedError extends Error {
    constructor() {
        super("Guest lending disabled");
        this.name = "GuestKickedError";
    }
}

export async function getEffectiveCredentials(session: SessionData) {
    const { capabilities } = getRuntimeConfig();
    
    // Get user's watch region from settings
    const userSettingsEntry = await db.query.config.findFirst({
        where: eq(configTable.key, `user_settings:${session.user?.Id}`),
    });
    let watchRegion = "SE";
    if (userSettingsEntry) {
        try {
            const s = JSON.parse(userSettingsEntry.value);
            if (s.watchRegion) watchRegion = s.watchRegion;
        } catch(e) {}
    }

    if (!session.user?.isGuest) {
        return {
            accessToken: session.user?.AccessToken,
            deviceId: session.user?.DeviceId,
            userId: session.user?.Id,
            serverUrl: session.user?.providerConfig?.serverUrl,
            tmdbToken: session.user?.providerConfig?.tmdbToken,
            provider: session.user?.provider,
            watchRegion
        };
    }

    if (!session.sessionCode) {
        throw new Error("Guest without session code");
    }

    const currentSession = await db.select().from(sessions).where(eq(sessions.code, session.sessionCode)).then((rows: any[]) => rows[0]);

    if (!currentSession) {
        throw new Error("Session not found");
    }


    if (capabilities.hasAuth && !currentSession.hostAccessToken) {
        throw new GuestKickedError();
    }

    return {
        accessToken: currentSession.hostAccessToken || "",
        deviceId: currentSession.hostDeviceId || "guest-device",
        userId: currentSession.hostUserId,
        serverUrl: currentSession.providerConfig ? JSON.parse(currentSession.providerConfig).serverUrl : undefined,
        tmdbToken: currentSession.providerConfig ? JSON.parse(currentSession.providerConfig).tmdbToken : undefined,
        provider: currentSession.provider || undefined,
        watchRegion
    };
}
