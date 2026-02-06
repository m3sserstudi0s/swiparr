import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { TmdbProvider } from "@/lib/providers/tmdb";
import { db, sessionMembers, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";

import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { ProviderType } from "@/lib/providers/types";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || "SE";
    const sessionCode = searchParams.get("sessionCode");

    const auth = await getEffectiveCredentials(session);
    const activeProvider = auth.provider || session.user.provider || ProviderType.JELLYFIN;

    if (activeProvider !== "tmdb") {
        return NextResponse.json({ providers: [] });
    }

    const provider = new TmdbProvider();
    const allProviders = await provider.getWatchProviders(region, auth);

    let memberSelections: Record<string, string[]> = {};
    let members: { externalUserId: string, externalUserName: string }[] = [];
    let accumulatedProviderIds: string[] = [];

    if (sessionCode) {
        const dbMembers = await db.query.sessionMembers.findMany({
            where: eq(sessionMembers.sessionCode, sessionCode),
        });
        
        members = dbMembers.map((m: { externalUserId: any; externalUserName: any; }) => ({ 
            externalUserId: m.externalUserId, 
            externalUserName: m.externalUserName 
        }));

        for (const m of dbMembers) {
            if (m.settings) {
                try {
                    const settings = JSON.parse(m.settings);
                    if (settings.watchProviders) {
                        for (const pId of settings.watchProviders) {
                            if (!memberSelections[pId]) memberSelections[pId] = [];
                            memberSelections[pId].push(m.externalUserId);
                        }
                    }
                } catch (e) {}
            }
        }
        accumulatedProviderIds = Object.keys(memberSelections);
    } else {
        // Solo mode - get from user settings
        const userSettingsEntry = await db.query.config.findFirst({
            where: eq(configTable.key, `user_settings:${session.user.Id}`),
        });
        if (userSettingsEntry) {
            try {
                const s = JSON.parse(userSettingsEntry.value);
                if (s.watchProviders) accumulatedProviderIds = s.watchProviders;
            } catch(e) {}
        }
    }

    // If we are coming from "settings" (no sessionCode and maybe a flag or just detect we want all)
    // Actually, the settings page should probably pass a flag if it wants ALL available for the region.
    const wantAll = searchParams.get("all") === "true";

    if (!wantAll && accumulatedProviderIds.length > 0) {
        const filteredProviders = allProviders
            .filter(p => accumulatedProviderIds.includes(p.Id))
            .map(p => ({
                ...p,
                MemberUserIds: memberSelections[p.Id] || []
            }));
        
        return NextResponse.json({ 
            providers: filteredProviders,
            members 
        });
    }

    return NextResponse.json({ providers: allProviders });
}
