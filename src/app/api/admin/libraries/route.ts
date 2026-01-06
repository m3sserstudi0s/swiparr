import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { isAdmin, getIncludedLibraries, setIncludedLibraries } from "@/lib/server/admin";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || !session.user.Id || !(await isAdmin(session.user.Id))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }


    const libraries = await getIncludedLibraries();
    return NextResponse.json(libraries);
}

import { libraryUpdateSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || !session.user.Id || !(await isAdmin(session.user.Id))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const validated = libraryUpdateSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const libraries = validated.data;


        await setIncludedLibraries(libraries);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update libraries" }, { status: 500 });
    }
}
