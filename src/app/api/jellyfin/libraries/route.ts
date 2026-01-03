import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import axios from "axios";
import { getJellyfinUrl, getAuthenticatedHeaders } from "@/lib/jellyfin/api";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const res = await axios.get(getJellyfinUrl(`/Users/${session.user.Id}/Views`), {
            headers: getAuthenticatedHeaders(session.user.AccessToken, session.user.DeviceId),
        });

        // Filter to only include Movie libraries
        const libraries = (res.data.Items || []).filter((lib: any) => 
            lib.CollectionType === "movies"
        );
        
        return NextResponse.json(libraries);
    } catch (error) {
        console.error("Fetch Libraries Error", error);
        return NextResponse.json({ error: "Failed to fetch libraries" }, { status: 500 });
    }
}
