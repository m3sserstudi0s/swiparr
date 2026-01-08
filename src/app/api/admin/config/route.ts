import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { isAdmin, getUseStaticFilterValues, setUseStaticFilterValues } from "@/lib/server/admin";
import { z } from "zod";

const configSchema = z.object({
    useStaticFilterValues: z.boolean(),
});

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || !session.user.Id || !(await isAdmin(session.user.Id))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const useStaticFilterValues = await getUseStaticFilterValues();
    return NextResponse.json({ useStaticFilterValues });
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || !session.user.Id || !(await isAdmin(session.user.Id))) {
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
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
}
