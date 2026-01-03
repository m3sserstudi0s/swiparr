import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { authenticateJellyfin } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { isAdmin } from "@/lib/server/admin";
import axios from "axios";

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();
        const deviceId = crypto.randomUUID();

        // Log the attempt (Don't log the password!)
        console.log(`[Auth] Attempting login for user: ${username} with deviceId: ${deviceId}`);

        const jellyfinUser = await authenticateJellyfin(username, password, deviceId);
        console.log("[Auth] Jellyfin API accepted credentials. User ID:", jellyfinUser.User.Id);

        const cookieStore = await cookies();
        const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

        session.user = {
            Id: jellyfinUser.User.Id,
            Name: jellyfinUser.User.Name,
            AccessToken: jellyfinUser.AccessToken,
            DeviceId: deviceId,
            isAdmin: await isAdmin(jellyfinUser.User.Id),
        };
        session.isLoggedIn = true;
    
    await session.save();
    console.log("[Auth] Session cookie saved.");

    return NextResponse.json({ success: true, user: session.user });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Auth] Login Failed:", errorMessage);
    
    // Check for specific Axios error response from Jellyfin
    if (axios.isAxiosError(error) && error.response) {
       console.error("[Auth] Jellyfin Status:", error.response.status);
       console.error("[Auth] Jellyfin Data:", JSON.stringify(error.response.data));
       
       if (error.response.status === 401) {
           return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
       }
    }

    return NextResponse.json(
      { message: "Server connection failed or invalid credentials" },
      { status: 500 }
    );
  }
}
