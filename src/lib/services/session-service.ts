import { v4 as uuidv4 } from "uuid";
import { eq, and, ne, count, sql, inArray } from "drizzle-orm";
import { db, sessions, sessionMembers, likes, hiddens, config as configTable, userProfiles } from "@/lib/db";
import { events, EVENT_TYPES } from "@/lib/events";
import { SessionSettings, Filters, SessionData } from "@/types";
import { ProviderType } from "@/lib/providers/types";

export class SessionService {
  private static generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async createSession(user: SessionData["user"], allowGuestLending: boolean) {
    const code = this.generateCode();
    
    await db.insert(sessions).values({
      id: uuidv4(),
      code,
      hostUserId: user.Id,
      hostAccessToken: allowGuestLending ? user.AccessToken : null,
      hostDeviceId: allowGuestLending ? user.DeviceId : null,
      provider: user.provider,
      providerConfig: user.providerConfig ? JSON.stringify(user.providerConfig) : null,
    });

    const userSettingsEntry = await db.query.config.findFirst({
      where: eq(configTable.key, `user_settings:${user.Id}`),
    });

    await db.insert(sessionMembers).values({
      sessionCode: code,
      externalUserId: user.Id,
      externalUserName: user.Name,
      settings: userSettingsEntry?.value || null,
    });

    events.emit(EVENT_TYPES.SESSION_UPDATED, code);
    return code;
  }

  static async joinSession(user: SessionData["user"], code: string) {
    const upperCode = code.trim().toUpperCase();
    const existingSession = await db.select().from(sessions).where(eq(sessions.code, upperCode)).then((rows: any[]) => rows[0]);

    if (!existingSession) {
      throw new Error("Session not found");
    }

    if (!user.isGuest) {
      if (existingSession.provider !== user.provider) {
        throw new Error(`Provider mismatch: Session is ${existingSession.provider}, you are ${user.provider}`);
      }

      if ([ProviderType.JELLYFIN, ProviderType.EMBY, ProviderType.PLEX].includes(existingSession.provider as any)) {
        const sessionConfig = existingSession.providerConfig ? JSON.parse(existingSession.providerConfig) : {};
        const userConfig = user.providerConfig || {};
        if (sessionConfig.serverUrl !== userConfig.serverUrl) {
          throw new Error(`Server mismatch: Session is on ${sessionConfig.serverUrl}, you are on ${userConfig.serverUrl}`);
        }
      }
    }

    const userSettingsEntry = await db.query.config.findFirst({
      where: eq(configTable.key, `user_settings:${user.Id}`),
    });

    await db.insert(sessionMembers).values({
      sessionCode: upperCode,
      externalUserId: user.Id,
      externalUserName: user.Name,
      settings: userSettingsEntry?.value || null,
    }).onConflictDoUpdate({
      target: [sessionMembers.sessionCode, sessionMembers.externalUserId],
      set: { settings: userSettingsEntry?.value || null }
    });

    events.emit(EVENT_TYPES.USER_JOINED, { sessionCode: upperCode, userName: user.Name, userId: user.Id });
    events.emit(EVENT_TYPES.SESSION_UPDATED, upperCode);

    return upperCode;
  }

  static async loginGuest(username: string, sessionCode: string | undefined, capabilities: any) {
    let code = sessionCode?.trim().toUpperCase();

    if (!code && !capabilities.hasAuth) {
      // TMDB mode: Create a new session if no code provided
      code = this.generateCode();
      const hostId = `user-${uuidv4()}`;
      await db.insert(sessions).values({
        id: uuidv4(),
        code,
        hostUserId: hostId,
        hostAccessToken: null,
        hostDeviceId: "guest-device",
        provider: "tmdb",
      });

      const user = {
        Id: hostId,
        Name: username,
        AccessToken: "",
        DeviceId: "guest-device",
        isGuest: false,
        provider: "tmdb" as ProviderType,
      };

      await db.insert(sessionMembers).values({
        sessionCode: code,
        externalUserId: hostId,
        externalUserName: username,
      });

      events.emit(EVENT_TYPES.SESSION_UPDATED, code);
      return { user, code };
    }

    if (!code) {
      throw new Error("Session code is required");
    }

    const existingSession = await db.select().from(sessions).where(eq(sessions.code, code)).then((rows: any[]) => rows[0]);

    if (!existingSession) {
      throw new Error("Session not found");
    }

    if (capabilities.hasAuth && !existingSession.hostAccessToken) {
      throw new Error("This session does not allow guest lending");
    }

    const isGuest = capabilities.hasAuth;
    const guestId = `${isGuest ? "guest" : "user"}-${uuidv4()}`;

    const user = {
      Id: guestId,
      Name: username,
      AccessToken: "",
      DeviceId: "guest-device",
      isGuest: isGuest,
      provider: isGuest ? undefined : (existingSession.provider as ProviderType || "tmdb" as ProviderType),
      providerConfig: existingSession.providerConfig ? JSON.parse(existingSession.providerConfig) : undefined,
    };

    await db.insert(sessionMembers).values({
      sessionCode: code,
      externalUserId: guestId,
      externalUserName: username,
    }).onConflictDoNothing();

    events.emit(EVENT_TYPES.SESSION_UPDATED, code);
    return { user, code };
  }

  static async leaveSession(user: SessionData["user"], sessionCode: string) {
    const userId = user.Id;
    
    if (user.isGuest || user.provider === "tmdb") {
      try {
        await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
      } catch (e) {
        console.error("Failed to cleanup profile picture", e);
      }
    }

    const userLikes = await db.query.likes.findMany({
      where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalUserId, userId))
    });
    const likedItemIds = userLikes.map((l: any) => l.externalId);

    await db.delete(sessionMembers).where(
      and(eq(sessionMembers.sessionCode, sessionCode), eq(sessionMembers.externalUserId, userId))
    );

    await db.delete(likes).where(
      and(eq(likes.sessionCode, sessionCode), eq(likes.externalUserId, userId))
    );
    await db.delete(hiddens).where(
      and(eq(hiddens.sessionCode, sessionCode), eq(hiddens.externalUserId, userId))
    );

    const remainingMembers = await db.query.sessionMembers.findMany({
      where: eq(sessionMembers.sessionCode, sessionCode),
    });

    if (remainingMembers.length === 0) {
      await db.delete(sessions).where(eq(sessions.code, sessionCode));
    } else {
      if (likedItemIds.length > 0) {
        const currentSession = await db.query.sessions.findFirst({
          where: eq(sessions.code, sessionCode)
        });
        const settings = currentSession?.settings ? JSON.parse(currentSession.settings) : {};
        
        for (const itemId of likedItemIds) {
          await this.reEvaluateMatch(sessionCode, itemId, settings, remainingMembers);
        }
      }
      events.emit(EVENT_TYPES.USER_LEFT, { sessionCode: sessionCode, userName: user.Name, userId });
      events.emit(EVENT_TYPES.SESSION_UPDATED, sessionCode);
    }
  }

  static async updateSession(sessionCode: string, user: SessionData["user"], updates: { filters?: Filters, settings?: SessionSettings, allowGuestLending?: boolean }) {
    const currentSession = await db.query.sessions.findFirst({
      where: eq(sessions.code, sessionCode)
    });

    if (!currentSession) throw new Error("Session not found");
    if (currentSession.hostUserId !== user.Id) throw new Error("Only the host can modify session settings");

    const updateData: any = {};
    if (updates.filters !== undefined) updateData.filters = JSON.stringify(updates.filters);
    if (updates.settings !== undefined) updateData.settings = JSON.stringify(updates.settings);
    if (updates.allowGuestLending !== undefined) {
      updateData.hostAccessToken = updates.allowGuestLending ? user.AccessToken : null;
      updateData.hostDeviceId = updates.allowGuestLending ? user.DeviceId : null;
    }

    await db.update(sessions).set(updateData).where(eq(sessions.code, sessionCode));

    if (updates.filters !== undefined) {
      events.emit(EVENT_TYPES.FILTERS_UPDATED, { sessionCode, userId: user.Id, userName: user.Name, filters: updates.filters });
    }
    if (updates.settings !== undefined) {
      events.emit(EVENT_TYPES.SETTINGS_UPDATED, { sessionCode, userId: user.Id, userName: user.Name, settings: updates.settings });
    }
    
    events.emit(EVENT_TYPES.SESSION_UPDATED, sessionCode);
  }

  static async addSwipe(user: SessionData["user"], sessionCode: string | null | undefined, itemId: string, direction: "left" | "right", item?: any) {
    let isMatch = false;
    let matchBlockedByLimit = false;
    let likedBy: any[] = [];

    const sessionData = sessionCode ? await db.query.sessions.findFirst({ where: eq(sessions.code, sessionCode) }) : null;
    const settings: SessionSettings | null = sessionData?.settings ? JSON.parse(sessionData.settings) : null;

    if (direction === "right") {
      if (sessionCode && settings?.maxRightSwipes) {
        const rightSwipeCount = await db.select({ value: count() }).from(likes).where(and(eq(likes.sessionCode, sessionCode), eq(likes.externalUserId, user.Id)));
        if (rightSwipeCount[0].value >= settings.maxRightSwipes) {
          throw new Error("Right swipe limit reached");
        }
      }

      if (sessionCode) {
        const [members, existingLikes, totalMatchCount] = await Promise.all([
          db.query.sessionMembers.findMany({ where: eq(sessionMembers.sessionCode, sessionCode) }),
          db.query.likes.findMany({
            where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId), ne(likes.externalUserId, user.Id))
          }),
          db.select({ value: sql<number>`count(distinct ${likes.externalId})` }).from(likes).where(and(eq(likes.sessionCode, sessionCode), eq(likes.isMatch, true)))
        ]);

        const numMembers = members.length;
        const matchStrategy = settings?.matchStrategy || "atLeastTwo";

        if (matchStrategy === "atLeastTwo") {
          if (existingLikes.length > 0) isMatch = true;
        } else if (matchStrategy === "allMembers") {
          if (existingLikes.length >= numMembers - 1 && numMembers > 1) isMatch = true;
        }

        if (isMatch && settings?.maxMatches && (totalMatchCount[0] as any).value >= settings.maxMatches) {
          isMatch = false;
          matchBlockedByLimit = true;
        }

        if (isMatch) {
          await db.update(likes).set({ isMatch: true }).where(and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId)));
          events.emit(EVENT_TYPES.MATCH_FOUND, { sessionCode, itemId, swiperId: user.Id, itemName: item?.Name || "a movie" });
          
          const allItemLikes = await db.query.likes.findMany({
            where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId))
          });
          likedBy = allItemLikes.map((l: any) => ({
            userId: l.externalUserId,
            userName: members.find((m: any) => m.externalUserId === l.externalUserId)?.externalUserName || "Unknown"
          }));
          // Add current user to likedBy since they are not in the DB yet
          likedBy.push({ userId: user.Id, userName: user.Name });
        }
      }

      await db.insert(likes).values({
        externalUserId: user.Id,
        externalId: itemId,
        sessionCode: sessionCode || null,
        isMatch: isMatch,
      });

      if (sessionCode && !isMatch) {
        events.emit(EVENT_TYPES.LIKE_UPDATED, { sessionCode, itemId, userId: user.Id });
      }
    } else {
      if (sessionCode && settings?.maxLeftSwipes) {
        const leftSwipeCount = await db.select({ value: count() }).from(hiddens).where(and(eq(hiddens.sessionCode, sessionCode), eq(hiddens.externalUserId, user.Id)));
        if (leftSwipeCount[0].value >= settings.maxLeftSwipes) {
          throw new Error("Left swipe limit reached");
        }
      }

      await db.insert(hiddens).values({
        externalUserId: user.Id,
        externalId: itemId,
        sessionCode: sessionCode || null,
      });
    }

    return { isMatch, likedBy, matchBlockedByLimit };
  }

  static async removeSwipe(user: SessionData["user"], itemId: string) {
    const sessionCode = (user as any).sessionCode; // We might need to pass this explicitly if not in user object
    // Actually, it's better to pass sessionCode explicitly or get it from session
    // For now, assume it might be in the user session context
  }

  // Refactored remove swipe to take sessionCode
  static async deleteSwipe(user: SessionData["user"], itemId: string, sessionCode?: string | null) {
    await db.delete(likes).where(and(eq(likes.externalUserId, user.Id), eq(likes.externalId, itemId)));
    
    if (sessionCode) {
      const [s, remainingLikes, members] = await Promise.all([
        db.query.sessions.findFirst({ where: eq(sessions.code, sessionCode) }),
        db.query.likes.findMany({ where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId)) }),
        db.query.sessionMembers.findMany({ where: eq(sessionMembers.sessionCode, sessionCode) })
      ]);

      const settings: SessionSettings | null = s?.settings ? JSON.parse(s.settings) : null;
      await this.reEvaluateMatch(sessionCode, itemId, settings, members, remainingLikes);
      
      events.emit(EVENT_TYPES.MATCH_REMOVED, { sessionCode, itemId, userId: user.Id });
    }

    await db.delete(hiddens).where(and(eq(hiddens.externalUserId, user.Id), eq(hiddens.externalId, itemId)));
  }

  private static async reEvaluateMatch(sessionCode: string, itemId: string, settings: any, members: any[], existingLikes?: any[]) {
    const itemLikes = existingLikes || await db.query.likes.findMany({
      where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId))
    });

    const matchStrategy = settings?.matchStrategy || "atLeastTwo";
    const numMembers = members.length;

    let stillAMatch = false;
    if (matchStrategy === "atLeastTwo") {
      stillAMatch = itemLikes.length >= 2;
    } else if (matchStrategy === "allMembers") {
      stillAMatch = itemLikes.length >= numMembers && numMembers > 0;
    }

    if (!stillAMatch) {
      await db.update(likes).set({ isMatch: false }).where(and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId)));
    }
  }
}
