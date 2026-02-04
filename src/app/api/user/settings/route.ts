import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { db, config, sessionMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { userSettingsSchema } from "@/lib/validations";
import { events, EVENT_TYPES } from "@/lib/events";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.Id;
    const userSettingsKey = `user_settings:${userId}`;
    
    const settingsEntry = await db.query.config.findFirst({
        where: eq(config.key, userSettingsKey),
    });

    if (!settingsEntry) {
        // Return default settings with null watchProviders to signify "all" or handle in frontend
        // But better to return the actual list if possible. 
        // For now let's return a flag or empty list and let frontend fetch all.
        return NextResponse.json({
            watchProviders: [], // Frontend will interpret empty + first load as "select all"
            watchRegion: "SE",
            isNew: true
        });
    }

    return NextResponse.json(JSON.parse(settingsEntry.value));
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.Id;
    const userSettingsKey = `user_settings:${userId}`;

    try {
        const body = await request.json();
        const validated = userSettingsSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
        }

        const newSettings = validated.data;
        const settingsValue = JSON.stringify(newSettings);

        // Update global user settings
        await db.insert(config).values({
            key: userSettingsKey,
            value: settingsValue,
        }).onConflictDoUpdate({
            target: config.key,
            set: { value: settingsValue },
        });

        // If user is in a session, update their SessionMember settings too
        if (session.sessionCode) {
            await db.update(sessionMembers)
                .set({ settings: settingsValue })
                .where(and(
                    eq(sessionMembers.sessionCode, session.sessionCode),
                    eq(sessionMembers.externalUserId, userId)
                ));
            
            // Notify session that a user's settings (and thus accumulated providers) changed
            events.emit(EVENT_TYPES.SESSION_UPDATED, session.sessionCode);
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
