import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { db, sessionMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { userSettingsSchema } from "@/lib/validations";
import { events, EVENT_TYPES } from "@/lib/events";
import { ConfigService } from "@/lib/services/config-service";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const settings = await ConfigService.getUserSettings(session.user.Id);

    if (!settings) {
        return NextResponse.json({
            watchProviders: [],
            watchRegion: "SE",
            isNew: true
        });
    }

    return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.Id;

    try {
        const body = await request.json();
        const validated = userSettingsSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
        }

        const newSettings = validated.data;
        await ConfigService.setUserSettings(userId, newSettings);

        if (session.sessionCode) {
            await db.update(sessionMembers)
                .set({ settings: JSON.stringify(newSettings) })
                .where(and(
                    eq(sessionMembers.sessionCode, session.sessionCode),
                    eq(sessionMembers.externalUserId, userId)
                ));
            
            events.emit(EVENT_TYPES.SESSION_UPDATED, {
                sessionCode: session.sessionCode,
                userId: session.user.Id,
                userName: session.user.Name,
                isSettingsUpdate: true
            });
            events.emit(EVENT_TYPES.FILTERS_UPDATED, {
                sessionCode: session.sessionCode,
                userId: session.user.Id,
                userName: session.user.Name,
                isSettingsUpdate: true
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update user settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
