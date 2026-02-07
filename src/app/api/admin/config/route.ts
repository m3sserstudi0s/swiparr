import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { isAdmin, getUseStaticFilterValues, setUseStaticFilterValues } from "@/lib/server/admin";
import { z } from "zod";
import { events, EVENT_TYPES } from "@/lib/events";
import { revalidateTag } from "next/cache";

const configSchema = z.object({
    useStaticFilterValues: z.boolean(),
});

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const useStaticFilterValues = await getUseStaticFilterValues();
    return NextResponse.json({ useStaticFilterValues });
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const validated = configSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const { useStaticFilterValues } = validated.data;

        await setUseStaticFilterValues(useStaticFilterValues);

        // Purge Next.js cache for all providers
        revalidateTag("jellyfin-years", "default");
        revalidateTag("jellyfin-genres", "default");
        revalidateTag("jellyfin-ratings", "default");
        revalidateTag("jellyfin-libraries", "default");
        revalidateTag("emby-years", "default");
        revalidateTag("emby-genres", "default");
        revalidateTag("emby-ratings", "default");
        revalidateTag("emby-libraries", "default");
        revalidateTag("plex-years", "default");
        revalidateTag("plex-genres", "default");
        revalidateTag("plex-ratings", "default");
        revalidateTag("plex-libraries", "default");

        // Notify all clients
        events.emit(EVENT_TYPES.ADMIN_CONFIG_UPDATED, {
            type: 'filters',
            userId: session.user.Id
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
}
