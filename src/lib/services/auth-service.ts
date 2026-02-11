import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SessionData } from "@/types";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { ConfigService } from "./config-service";
import { ProviderType, PROVIDER_CAPABILITIES } from "../providers/types";
import { config as appConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

export class GuestKickedError extends Error {
  constructor() {
    super("Guest lending disabled");
    this.name = "GuestKickedError";
  }
}

export class AuthService {
  static async getEffectiveCredentials(session: SessionData) {
    logger.debug(`[AuthService.getEffectiveCredentials] for user ${session.user?.Name} (${session.user?.Id})`);
    const { capabilities } = getRuntimeConfig();
    const settings = await ConfigService.getUserSettings(session.user?.Id);
    const watchRegion = settings?.watchRegion || "SE";

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

  static async isAdmin(userId: string, username?: string, provider?: string, isGuest?: boolean): Promise<boolean> {
    if (isGuest) return false;

    const activeProvider = (provider || await ConfigService.getActiveProvider()) as ProviderType;
    const capabilities = PROVIDER_CAPABILITIES[activeProvider] || PROVIDER_CAPABILITIES[ProviderType.JELLYFIN];
    
    if (!capabilities.hasAuth) return false;

    if (username) {
      let targetAdmin = appConfig.auth.adminUsername;
      if (provider && provider !== appConfig.app.provider) {
        const p = provider.toLowerCase() as ProviderType;
        if (p === ProviderType.JELLYFIN) targetAdmin = appConfig.JELLYFIN_ADMIN_USERNAME || appConfig.ADMIN_USERNAME;
        else if (p === ProviderType.EMBY) targetAdmin = appConfig.EMBY_ADMIN_USERNAME || appConfig.ADMIN_USERNAME;
        else if (p === ProviderType.PLEX) targetAdmin = appConfig.PLEX_ADMIN_USERNAME || appConfig.ADMIN_USERNAME;
      }
      if (targetAdmin && username.toLowerCase() === targetAdmin.toLowerCase()) return true;
    }

    const adminUserId = await ConfigService.getAdminUserId(activeProvider);
    return adminUserId === userId;
  }
}
