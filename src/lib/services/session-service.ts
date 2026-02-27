import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { eq, and, ne, count, sql, isNull } from "drizzle-orm";
import { db, sessions, sessionMembers, likes, hiddens, userProfiles } from "@/lib/db";
import { EVENT_TYPES } from "@/lib/events";
import { EventService } from "./event-service";
import { SessionSettings, Filters, SessionData } from "@/types";
import { ProviderType } from "@/lib/providers/types";
import { ConfigService } from "./config-service";
import { logger } from "@/lib/logger";
import { encryptValue, getGuestLendingSecret } from "@/lib/security/crypto";

export class SessionService {
  private static generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no ambiguous I/O/0/1
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => chars[b % 32]).join("");
  }

  private static generateRandomSeed(): string {
    // 24 random bytes → 32 base64url characters, 192 bits of entropy
    return crypto.randomBytes(24).toString("base64url");
  }

  static async createSession(user: SessionData["user"], allowGuestLending: boolean) {
    const code = this.generateCode();
    logger.info(`Creating session ${code} for user ${user.Name} (${user.Id})`);
    const hasAccessToken = !!user.AccessToken;
    const shouldEncrypt = allowGuestLending && hasAccessToken;
    const encryptionSecret = shouldEncrypt ? await getGuestLendingSecret() : null;
    const encryptedAccessToken = shouldEncrypt ? encryptValue(user.AccessToken!, encryptionSecret!) : null;
    const encryptedDeviceId = shouldEncrypt ? encryptValue(user.DeviceId || "", encryptionSecret!) : null;
    
    await db.insert(sessions).values({
      id: uuidv4(),
      code,
      hostUserId: user.Id,
      hostAccessToken: shouldEncrypt ? encryptedAccessToken : null,
      hostDeviceId: shouldEncrypt ? encryptedDeviceId : null,
      provider: user.provider,
      providerConfig: user.providerConfig ? JSON.stringify(user.providerConfig) : null,
      randomSeed: this.generateRandomSeed(),
    });

    const settings = await ConfigService.getUserSettings(user.Id);

    await db.insert(sessionMembers).values({
      sessionCode: code,
      externalUserId: user.Id,
      externalUserName: user.Name,
      settings: settings ? JSON.stringify(settings) : null,
    });

    await EventService.emit(EVENT_TYPES.SESSION_UPDATED, code);
    return code;
  }

  static async joinSession(user: SessionData["user"], code: string) {
    const upperCode = code.trim().toUpperCase();
    logger.debug(`User ${user.Name} joining session ${upperCode}`);
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

    const settings = await ConfigService.getUserSettings(user.Id);

    await db.insert(sessionMembers).values({
      sessionCode: upperCode,
      externalUserId: user.Id,
      externalUserName: user.Name,
      settings: settings ? JSON.stringify(settings) : null,
    }).onConflictDoUpdate({
      target: [sessionMembers.sessionCode, sessionMembers.externalUserId],
      set: { settings: settings ? JSON.stringify(settings) : null }
    });

    await EventService.emit(EVENT_TYPES.USER_JOINED, { sessionCode: upperCode, userName: user.Name, userId: user.Id });
    await EventService.emit(EVENT_TYPES.SESSION_UPDATED, upperCode);

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
        provider: ProviderType.TMDB,
        randomSeed: this.generateRandomSeed(),
      });

      const user = {
        Id: hostId,
        Name: username,
        AccessToken: "",
        DeviceId: "guest-device",
        isGuest: false,
        provider: ProviderType.TMDB,
      };

      await db.insert(sessionMembers).values({
        sessionCode: code,
        externalUserId: hostId,
        externalUserName: username,
      });

      await EventService.emit(EVENT_TYPES.SESSION_UPDATED, code);
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
      provider: isGuest ? undefined : (existingSession.provider as ProviderType || ProviderType.TMDB),
      providerConfig: existingSession.providerConfig ? JSON.parse(existingSession.providerConfig) : undefined,
    };

    await db.insert(sessionMembers).values({
      sessionCode: code,
      externalUserId: guestId,
      externalUserName: username,
    }).onConflictDoNothing();

    await EventService.emit(EVENT_TYPES.SESSION_UPDATED, code);
    return { user, code };
  }

  static async leaveSession(user: SessionData["user"], sessionCode: string) {
    const userId = user.Id;
    
    if (user.isGuest || user.provider === ProviderType.TMDB) {
      try {
        await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
      } catch (e) {
        logger.error("Failed to cleanup profile picture", e);
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
      await EventService.emit(EVENT_TYPES.USER_LEFT, { sessionCode: sessionCode, userName: user.Name, userId });
      await EventService.emit(EVENT_TYPES.SESSION_UPDATED, sessionCode);
    }
  }

  static async updateSession(sessionCode: string, user: SessionData["user"], updates: { filters?: Filters, settings?: SessionSettings, allowGuestLending?: boolean }) {
    const currentSession = await db.query.sessions.findFirst({
      where: eq(sessions.code, sessionCode)
    });

    if (!currentSession) throw new Error("Session not found");

    const updateData: any = {};
    
    // Filters can be updated by any session member
    if (updates.filters !== undefined) {
      updateData.filters = JSON.stringify(updates.filters);
    }
    
    // Settings and guest lending can only be updated by the host
    if (updates.settings !== undefined || updates.allowGuestLending !== undefined) {
      if (currentSession.hostUserId !== user.Id) {
        throw new Error("Only the host can modify session settings");
      }
      if (updates.settings !== undefined) updateData.settings = JSON.stringify(updates.settings);
      if (updates.allowGuestLending !== undefined) {
        if (updates.allowGuestLending && user.AccessToken) {
          const secret = await getGuestLendingSecret();
          updateData.hostAccessToken = encryptValue(user.AccessToken, secret);
          updateData.hostDeviceId = encryptValue(user.DeviceId || "", secret);
        } else {
          updateData.hostAccessToken = null;
          updateData.hostDeviceId = null;
        }
      }
    }

    await db.update(sessions).set(updateData).where(eq(sessions.code, sessionCode));

    if (updates.filters !== undefined) {
      await EventService.emit(EVENT_TYPES.FILTERS_UPDATED, { sessionCode, userId: user.Id, userName: user.Name, filters: updates.filters });
    }
    if (updates.settings !== undefined) {
      await EventService.emit(EVENT_TYPES.SETTINGS_UPDATED, { sessionCode, userId: user.Id, userName: user.Name, settings: updates.settings });
    }
    
    await EventService.emit(EVENT_TYPES.SESSION_UPDATED, sessionCode);
  }

  static async addSwipe(user: SessionData["user"], sessionCode: string | null | undefined, itemId: string, direction: "left" | "right", item?: any) {
    // Check for existing swipes to handle conversions and re-likes
    // Should be impossible by not showing the same card twice
    const [existingLike, existingHidden] = await Promise.all([
      db.query.likes.findFirst({
        where: and(
          eq(likes.externalUserId, user.Id),
          eq(likes.externalId, itemId),
          sessionCode ? eq(likes.sessionCode, sessionCode) : isNull(likes.sessionCode)
        )
      }),
      db.query.hiddens.findFirst({
        where: and(
          eq(hiddens.externalUserId, user.Id),
          eq(hiddens.externalId, itemId),
          sessionCode ? eq(hiddens.sessionCode, sessionCode) : isNull(hiddens.sessionCode)
        )
      })
    ]);

    let isMatch = false;
    let matchBlockedByLimit = false;
    let likedBy: any[] = [];

    const sessionData = sessionCode ? await db.query.sessions.findFirst({ where: eq(sessions.code, sessionCode) }) : null;
    const settings: SessionSettings | null = sessionData?.settings ? JSON.parse(sessionData.settings) : null;

    if (direction === "right") {
      // If we are liking something that was previously hidden, remove it from hiddens
      if (existingHidden) {
        await db.delete(hiddens).where(eq(hiddens.id, existingHidden.id));
      }

      if (sessionCode && settings?.maxRightSwipes && !existingLike) {
        const rightSwipeCount = await db.select({ value: count() }).from(likes).where(and(eq(likes.sessionCode, sessionCode), eq(likes.externalUserId, user.Id)));
        if (rightSwipeCount[0].value >= settings.maxRightSwipes) {
          throw new Error("Right swipe limit reached");
        }
      }

      if (sessionCode) {
        const [members, otherLikes, totalMatchCount] = await Promise.all([
          db.select({
            externalUserId: sessionMembers.externalUserId,
            externalUserName: sessionMembers.externalUserName,
            hasCustomProfilePicture: sql<boolean>`CASE WHEN ${userProfiles.userId} IS NOT NULL THEN 1 ELSE 0 END`,
            profileUpdatedAt: userProfiles.updatedAt,
          })
          .from(sessionMembers)
          .leftJoin(userProfiles, eq(sessionMembers.externalUserId, userProfiles.userId))
          .where(eq(sessionMembers.sessionCode, sessionCode)),
          db.query.likes.findMany({
            where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId), ne(likes.externalUserId, user.Id))
          }),
          db.select({ value: sql<number>`count(distinct ${likes.externalId})` }).from(likes).where(and(eq(likes.sessionCode, sessionCode), eq(likes.isMatch, true)))
        ]);

        const numMembers = members.length;
        const matchStrategy = settings?.matchStrategy || "atLeastTwo";

        if (matchStrategy === "atLeastTwo") {
          if (otherLikes.length > 0) isMatch = true;
        } else if (matchStrategy === "allMembers") {
          if (otherLikes.length >= numMembers - 1 && numMembers > 1) isMatch = true;
        }

        if (isMatch && settings?.maxMatches && (totalMatchCount[0] as any).value >= settings.maxMatches) {
          isMatch = false;
          matchBlockedByLimit = true;
        }

        if (isMatch) {
          await db.update(likes).set({ isMatch: true }).where(and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId)));
          await EventService.emit(EVENT_TYPES.MATCH_FOUND, { sessionCode, itemId, swiperId: user.Id, itemName: item?.Name || "a movie" });
          
          const allItemLikes = await db.query.likes.findMany({
            where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId))
          });
          likedBy = allItemLikes.map((l: any) => {
            const member = members.find((m: any) => m.externalUserId === l.externalUserId);
            return {
              userId: l.externalUserId,
              userName: member?.externalUserName || "Unknown",
              hasCustomProfilePicture: !!member?.hasCustomProfilePicture,
              profileUpdatedAt: member?.profileUpdatedAt,
            };
          });
          // Add current user to likedBy since they are not in the DB yet (or might be an existing one we're updating)
          if (!likedBy.some(l => l.userId === user.Id)) {
            const currentUserProfile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, user.Id) });
            likedBy.push({ 
              userId: user.Id, 
              userName: user.Name,
              hasCustomProfilePicture: !!currentUserProfile,
              profileUpdatedAt: currentUserProfile?.updatedAt,
            });
          }
        }
      }

      if (existingLike) {
        // Update existing like to move it to the top (fresh like)
        await db.update(likes).set({ 
          createdAt: sql`CURRENT_TIMESTAMP`,
          isMatch: isMatch
        }).where(eq(likes.id, existingLike.id));
      } else {
        try {
          await db.insert(likes).values({
            externalUserId: user.Id,
            externalId: itemId,
            sessionCode: sessionCode || null,
            isMatch: isMatch,
          });
        } catch (e: any) {
          // If it still fails with a unique constraint, someone else (or a concurrent request) already swiped
          if (e.message?.includes("UNIQUE") || e.code === "SQLITE_CONSTRAINT") {
            return { isMatch, likedBy, matchBlockedByLimit };
          }
          throw e;
        }
      }

      if (sessionCode && !isMatch) {
        await EventService.emit(EVENT_TYPES.LIKE_UPDATED, { sessionCode, itemId, userId: user.Id });
      }
    } else {
      // If we are hiding something that was previously liked, remove it from likes
      if (existingLike) {
        await db.delete(likes).where(eq(likes.id, existingLike.id));
        
        // If it was a match, we need to re-evaluate it for others
        if (sessionCode && existingLike.isMatch) {
          const [s, remainingLikes, members] = await Promise.all([
            db.query.sessions.findFirst({ where: eq(sessions.code, sessionCode) }),
            db.query.likes.findMany({ where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId)) }),
            db.query.sessionMembers.findMany({ where: eq(sessionMembers.sessionCode, sessionCode) })
          ]);
          const sessionSettings: SessionSettings | null = s?.settings ? JSON.parse(s.settings) : null;
          await this.reEvaluateMatch(sessionCode, itemId, sessionSettings, members, remainingLikes);
          await EventService.emit(EVENT_TYPES.MATCH_REMOVED, { sessionCode, itemId, userId: user.Id });
        }
      }

      if (sessionCode && settings?.maxLeftSwipes && !existingHidden) {
        const leftSwipeCount = await db.select({ value: count() }).from(hiddens).where(and(eq(hiddens.sessionCode, sessionCode), eq(hiddens.externalUserId, user.Id)));
        if (leftSwipeCount[0].value >= settings.maxLeftSwipes) {
          throw new Error("Left swipe limit reached");
        }
      }

      if (existingHidden) {
         // Just a no-op 
      } else {
        try {
          await db.insert(hiddens).values({
            externalUserId: user.Id,
            externalId: itemId,
            sessionCode: sessionCode || null,
          });
        } catch (e: any) {
          if (e.message?.includes("UNIQUE") || e.code === "SQLITE_CONSTRAINT") {
            return { isMatch, likedBy, matchBlockedByLimit };
          }
          throw e;
        }
      }
    }

    return { isMatch, likedBy, matchBlockedByLimit };
  }

  static async deleteSwipe(user: SessionData["user"], itemId: string, sessionCode?: string | null) {
    await db.delete(likes).where(
      and(
        eq(likes.externalUserId, user.Id), 
        eq(likes.externalId, itemId),
        sessionCode ? eq(likes.sessionCode, sessionCode) : isNull(likes.sessionCode)
      )
    );
    
    if (sessionCode) {
      const [s, remainingLikes, members] = await Promise.all([
        db.query.sessions.findFirst({ where: eq(sessions.code, sessionCode) }),
        db.query.likes.findMany({ where: and(eq(likes.sessionCode, sessionCode), eq(likes.externalId, itemId)) }),
        db.query.sessionMembers.findMany({ where: eq(sessionMembers.sessionCode, sessionCode) })
      ]);

      const settings: SessionSettings | null = s?.settings ? JSON.parse(s.settings) : null;
      await this.reEvaluateMatch(sessionCode, itemId, settings, members, remainingLikes);
      
      await EventService.emit(EVENT_TYPES.MATCH_REMOVED, { sessionCode, itemId, userId: user.Id });
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
