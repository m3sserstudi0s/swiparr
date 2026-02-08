import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { events, EVENT_TYPES } from "@/lib/events";
import { revalidateTag } from "next/cache";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";
import { libraryUpdateSchema } from "@/lib/validations";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const libraries = await ConfigService.getIncludedLibraries();
    return NextResponse.json(libraries);
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const validated = libraryUpdateSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const libraries = validated.data;
        await ConfigService.setIncludedLibraries(libraries);
        
        revalidateTag("jellyfin-libraries", "default");

        events.emit(EVENT_TYPES.ADMIN_CONFIG_UPDATED, {
            type: 'libraries',
            userId: session.user.Id
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update libraries" }, { status: 500 });
    }
}
