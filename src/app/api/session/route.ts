import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { isAdmin } from "@/lib/server/admin";
import { getEffectiveCredentials, GuestKickedError } from "@/lib/server/auth-resolver";
import { sessionActionSchema, sessionSettingsSchema } from "@/lib/validations";
import { getMediaProvider } from "@/lib/providers/factory";
import { ProviderType } from "@/lib/providers/types";
import { SessionService } from "@/lib/services/session-service";
import { db, sessions, config as configTable, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return NextResponse.json(null);

  const body = await request.json();
  const validated = sessionActionSchema.safeParse(body);
  if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  
  const { action, code: bodyCode, allowGuestLending } = validated.data;

  try {
    if (action === "join") {
      if (!bodyCode) return NextResponse.json({ error: "Code required" }, { status: 400 });
      const code = await SessionService.joinSession(session.user, bodyCode);
      session.sessionCode = code;
      await session.save();
      return NextResponse.json({ success: true, code });
    }

    if (action === "create") {
      const code = await SessionService.createSession(session.user, allowGuestLending === true);
      session.sessionCode = code;
      await session.save();
      return NextResponse.json({ success: true, code });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const validated = sessionSettingsSchema.safeParse(body);
  if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { filters, settings, allowGuestLending } = validated.data;

  if (session.sessionCode) {
    try {
      await SessionService.updateSession(session.sessionCode, session.user, { filters, settings, allowGuestLending });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
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
  
  if (!session.isLoggedIn) return NextResponse.json(null);

  let effectiveUserId = null;
  let activeProvider = session.user.provider || ProviderType.JELLYFIN;
  let activeServerUrl = session.user.providerConfig?.serverUrl;

  try {
    const creds = await getEffectiveCredentials(session);
    effectiveUserId = creds.userId;
    if (creds.provider) activeProvider = creds.provider;
    if (creds.serverUrl) activeServerUrl = creds.serverUrl;
  } catch (err) {
    if (err instanceof GuestKickedError) {
      session.destroy();
      return NextResponse.json({ error: "guest_kicked" }, { status: 403 });
    }
    console.error("Failed to get effective credentials:", err);
  }

  let filters = session.soloFilters || null;
  let settings = null;
  let hostUserId = null;

  if (session.sessionCode) {
    const currentSession = await db.select().from(sessions).where(eq(sessions.code, session.sessionCode)).then((rows: any[]) => rows[0]);
    filters = currentSession?.filters ? JSON.parse(currentSession.filters) : null;
    settings = currentSession?.settings ? JSON.parse(currentSession.settings) : null;
    hostUserId = currentSession?.hostUserId || null;
  }

  const userSettingsEntry = await db.query.config.findFirst({
    where: eq(configTable.key, `user_settings:${session.user.Id}`),
  });
  const settingsHash = userSettingsEntry?.value ? userSettingsEntry.value.length.toString(16) + userSettingsEntry.value.slice(-8) : 'default';

  const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.Id),
  });

  return NextResponse.json({ 
    code: session.sessionCode || null,
    userId: session.user.Id,
    userName: session.user.Name,
    effectiveUserId,
    isGuest: !!session.user.isGuest,
    isAdmin: await isAdmin(session.user.Id, session.user.Name, activeProvider, !!session.user.isGuest),
    hostUserId,
    filters,
    settings,
    provider: activeProvider,
    capabilities: getMediaProvider(activeProvider).capabilities,
    serverUrl: activeServerUrl,
    settingsHash,
    hasCustomProfilePicture: !!profile
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  
  if (session.isLoggedIn && session.user && session.sessionCode) {
    await SessionService.leaveSession(session.user, session.sessionCode);
  }

  session.sessionCode = undefined;
  await session.save();
  return NextResponse.json({ success: true });
}
