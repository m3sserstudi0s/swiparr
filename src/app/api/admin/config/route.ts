import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { z } from "zod";
import { events, EVENT_TYPES } from "@/lib/events";
import { revalidateTag } from "next/cache";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";
import { tagProvider } from "@/lib/cache-tags";
import { ProviderType } from "@/lib/providers/types";

const configSchema = z.object({
    useStaticFilterValues: z.boolean(),
});

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const useStaticFilterValues = await ConfigService.getUseStaticFilterValues();
    return NextResponse.json({ useStaticFilterValues });
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const validated = configSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const { useStaticFilterValues } = validated.data;
        await ConfigService.setUseStaticFilterValues(useStaticFilterValues);

        // Purge caches
        const providers = [ProviderType.JELLYFIN, ProviderType.EMBY, ProviderType.PLEX];
        const tags = ["years", "genres", "ratings", "libraries"] as const;
        providers.forEach((p) => tags.forEach((t) => revalidateTag(tagProvider(p, t), "default")));

        events.emit(EVENT_TYPES.ADMIN_CONFIG_UPDATED, {
            type: 'filters',
            userId: session.user.Id
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
}
