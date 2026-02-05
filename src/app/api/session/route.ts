import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, sessions, sessionMembers, likes, hiddens, config as configTable } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { events, EVENT_TYPES } from "@/lib/events";
import { isAdmin } from "@/lib/server/admin";
import { getEffectiveCredentials, GuestKickedError } from "@/lib/server/auth-resolver";
import { sessionActionSchema, sessionSettingsSchema } from "@/lib/validations";
import { getMediaProvider } from "@/lib/providers/factory";

function generateCode() {
    // Simple 4-letter code (e.g., AXYZ)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const validated = sessionActionSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    
    const { action, code: bodyCode, allowGuestLending } = validated.data;

    // ACTION: JOIN
    if (action === "join") {
        if (!bodyCode) return NextResponse.json({ error: "Code required" }, { status: 400 });
        const code = bodyCode.toUpperCase();

        const existingSession = await db.query.sessions.findFirst({
            where: eq(sessions.code, code),
        });


        if (!existingSession) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Validate provider compatibility (only for non-guests)
        if (!session.user.isGuest) {
            const sessionProvider = existingSession.provider;
            const userProvider = session.user.provider;

            if (sessionProvider !== userProvider) {
                return NextResponse.json({ 
                    error: `Provider mismatch: This session is for ${sessionProvider}, but you are logged in with ${userProvider || 'no provider'}.` 
                }, { status: 400 });
            }

            // For server-based providers, validate server URL
            if (["jellyfin", "emby", "plex"].includes(sessionProvider || "")) {
                const sessionConfig = existingSession.providerConfig ? JSON.parse(existingSession.providerConfig) : {};
                const userConfig = session.user.providerConfig || {};
                
                if (sessionConfig.serverUrl !== userConfig.serverUrl) {
                    return NextResponse.json({ 
                        error: `Server mismatch: This session is hosted on ${sessionConfig.serverUrl}, but you are connected to ${userConfig.serverUrl || 'a different server'}.` 
                    }, { status: 400 });
                }
            }
        }

        // Register member
        try {
            const userSettingsEntry = await db.query.config.findFirst({
                where: eq(configTable.key, `user_settings:${session.user.Id}`),
            });

            await db.insert(sessionMembers).values({
                sessionCode: code,
                externalUserId: session.user.Id,
                externalUserName: session.user.Name,
                settings: userSettingsEntry?.value || null,
            }).onConflictDoUpdate({
                target: [sessionMembers.sessionCode, sessionMembers.externalUserId],
                set: { settings: userSettingsEntry?.value || null }
            });
        } catch (e) {
            console.error("Failed to register member or settings", e);
        }

        session.sessionCode = code;
        await session.save();

        events.emit(EVENT_TYPES.USER_JOINED, { sessionCode: code, userName: session.user.Name, userId: session.user.Id });
        events.emit(EVENT_TYPES.SESSION_UPDATED, code);

        return NextResponse.json({ success: true, code });
    }

    // ACTION: CREATE
    if (action === "create") {
        const code = generateCode();
        const allowLending = allowGuestLending === true;


        await db.insert(sessions).values({
            id: uuidv4(),
            code,
            hostUserId: session.user.Id,
            hostAccessToken: allowLending ? session.user.AccessToken : null,
            hostDeviceId: allowLending ? session.user.DeviceId : null,
            provider: session.user.provider,
            providerConfig: session.user.providerConfig ? JSON.stringify(session.user.providerConfig) : null,
        });

        // Register host as member
        const userSettingsEntry = await db.query.config.findFirst({
            where: eq(configTable.key, `user_settings:${session.user.Id}`),
        });

        await db.insert(sessionMembers).values({
            sessionCode: code,
            externalUserId: session.user.Id,
            externalUserName: session.user.Name,
            settings: userSettingsEntry?.value || null,
        });


        session.sessionCode = code;
        await session.save();

        events.emit(EVENT_TYPES.SESSION_UPDATED, code);

        return NextResponse.json({ success: true, code });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const validated = sessionSettingsSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { filters, settings, allowGuestLending } = validated.data;

    if (session.sessionCode) {
        // Enforce that only the host can update session settings
        const currentSession = await db.query.sessions.findFirst({
            where: eq(sessions.code, session.sessionCode)
        });

        if (!currentSession || ((settings !== undefined || allowGuestLending !== undefined) && currentSession.hostUserId !== session.user.Id)) {
            return NextResponse.json({ error: "Only the host can modify session settings" }, { status: 403 });
        }

        const updateData: any = {};

        if (filters !== undefined) updateData.filters = JSON.stringify(filters);
        if (settings !== undefined) updateData.settings = JSON.stringify(settings);
        
        if (allowGuestLending !== undefined) {
            updateData.hostAccessToken = allowGuestLending ? session.user.AccessToken : null;
            updateData.hostDeviceId = allowGuestLending ? session.user.DeviceId : null;
        }

        await db.update(sessions)
            .set(updateData)
            .where(eq(sessions.code, session.sessionCode));

        if (filters !== undefined) {
            events.emit(EVENT_TYPES.FILTERS_UPDATED, {
                sessionCode: session.sessionCode,
                userId: session.user.Id,
                userName: session.user.Name,
                filters
            });
        }

        if (settings !== undefined) {
            events.emit(EVENT_TYPES.SETTINGS_UPDATED, {
                sessionCode: session.sessionCode,
                userId: session.user.Id,
                userName: session.user.Name,
                settings
            });
        }
    } else {
        if (filters !== undefined) session.soloFilters = filters;
        await session.save();
    }

    return NextResponse.json({ success: true });
}

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  let effectiveUserId = null;
  let activeProvider = session.user.provider || "jellyfin";
  let activeServerUrl = session.user.providerConfig?.serverUrl;

  try {
    const creds = await getEffectiveCredentials(session);
    effectiveUserId = creds.userId;
    if (creds.provider) activeProvider = creds.provider;
    if (creds.serverUrl) activeServerUrl = creds.serverUrl;
  } catch (err) {
    if (err instanceof GuestKickedError) {
        // Automatically logout the guest if they were kicked
        session.destroy();
        return NextResponse.json({ error: "guest_kicked" }, { status: 403 });
    }
    // For other errors, we might still want to return basic info or a generic error
    console.error("Failed to get effective credentials:", err);
  }

  let filters = session.soloFilters || null;
  let settings = null;
  let hostUserId = null;

  if (session.sessionCode) {
    const currentSession = await db.query.sessions.findFirst({
        where: eq(sessions.code, session.sessionCode)
    });
    filters = currentSession?.filters ? JSON.parse(currentSession.filters) : null;
    settings = currentSession?.settings ? JSON.parse(currentSession.settings) : null;
    hostUserId = currentSession?.hostUserId || null;
  }

  const userSettingsEntry = await db.query.config.findFirst({
    where: eq(configTable.key, `user_settings:${session.user.Id}`),
  });
  const settingsHash = userSettingsEntry?.value ? userSettingsEntry.value.length.toString(16) + userSettingsEntry.value.slice(-8) : 'default';

  const response = { 
    code: session.sessionCode || null,
    userId: session.user.Id,
    userName: session.user.Name,
    effectiveUserId,
    isGuest: !!session.user.isGuest,
    isAdmin: await isAdmin(session.user.Id, session.user.Name, activeProvider),
    hostUserId,
    filters,
    settings,
    provider: activeProvider,
    capabilities: getMediaProvider(activeProvider).capabilities,
    serverUrl: activeServerUrl,
    settingsHash
  };


  return NextResponse.json(response);
}

export async function DELETE() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    
    if (session.isLoggedIn && session.user && session.sessionCode) {
        const code = session.sessionCode;
        const userId = session.user.Id;
        const userName = session.user.Name;

        // 0. Find items this user liked in this session
        const userLikes = await db.query.likes.findMany({
            where: and(
                eq(likes.sessionCode, code),
                eq(likes.externalUserId, userId)
            )
        });
        const likedItemIds = userLikes.map(l => l.externalId);

        // 1. Remove member from session
        await db.delete(sessionMembers).where(
            and(
                eq(sessionMembers.sessionCode, code),
                eq(sessionMembers.externalUserId, userId)
            )
        );

        // 1.1 Clear user's traces (likes and hiddens) for this session
        await db.delete(likes).where(
            and(
                eq(likes.sessionCode, code),
                eq(likes.externalUserId, userId)
            )
        );
        await db.delete(hiddens).where(
            and(
                eq(hiddens.sessionCode, code),
                eq(hiddens.externalUserId, userId)
            )
        );

        // 2. Check if any members left
        const remainingMembers = await db.query.sessionMembers.findMany({
            where: eq(sessionMembers.sessionCode, code),
        });

        if (remainingMembers.length === 0) {
            // 3. Delete session if no members left (will cascade to likes/hiddens)
            await db.delete(sessions).where(eq(sessions.code, code));
        } else {
            // 4. Re-evaluate matches for the items the user liked
            if (likedItemIds.length > 0) {
                const currentSession = await db.query.sessions.findFirst({
                    where: eq(sessions.code, code)
                });
                const settings = currentSession?.settings ? JSON.parse(currentSession.settings) : {};
                const matchStrategy = settings.matchStrategy || "atLeastTwo";
                const numMembers = remainingMembers.length;

                for (const itemId of likedItemIds) {
                    const remainingItemLikes = await db.query.likes.findMany({
                        where: and(
                            eq(likes.sessionCode, code),
                            eq(likes.externalId, itemId)
                        )
                    });

                    let stillAMatch = false;
                    if (matchStrategy === "atLeastTwo") {
                        stillAMatch = remainingItemLikes.length >= 2;
                    } else if (matchStrategy === "allMembers") {
                        stillAMatch = remainingItemLikes.length >= numMembers && numMembers > 0;
                    }

                    if (!stillAMatch) {
                        await db.update(likes)
                            .set({ isMatch: false })
                            .where(and(
                                eq(likes.sessionCode, code),
                                eq(likes.externalId, itemId)
                            ));
                    }
                }
            }

            events.emit(EVENT_TYPES.USER_LEFT, { sessionCode: code, userName, userId });
            events.emit(EVENT_TYPES.SESSION_UPDATED, code);
        }
    }

    session.sessionCode = undefined;
    await session.save();
    return NextResponse.json({ success: true });
}
