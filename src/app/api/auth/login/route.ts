import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { authenticateJellyfin } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { isAdmin, setAdminUserId } from "@/lib/server/admin";
import { apiClient } from "@/lib/jellyfin/api";
import axios from "axios";

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();
        // Create a unique deviceId for this user-device combination
        // Using a hash or simply appending username to a base device ID
        const baseDeviceId = crypto.randomUUID();
        const deviceId = `${baseDeviceId}-${username}`;

        // Log the attempt (Don't log the password!)
        console.log(`[Auth] Attempting login for user: ${username} with deviceId: ${deviceId}`);

        const jellyfinUser = await authenticateJellyfin(username, password, deviceId);
        console.log("[Auth] Jellyfin API accepted credentials. User ID:", jellyfinUser.User.Id);

        // Set as admin if no admin exists
        const wasMadeAdmin = await setAdminUserId(jellyfinUser.User.Id);
        if (wasMadeAdmin) {
            console.log(`[Auth] User ${jellyfinUser.User.Name} (${jellyfinUser.User.Id}) set as initial admin.`);
        }

        const cookieStore = await cookies();
        const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

        session.user = {
            Id: jellyfinUser.User.Id,
            Name: jellyfinUser.User.Name,
            AccessToken: jellyfinUser.AccessToken,
            DeviceId: deviceId,
            isAdmin: await isAdmin(jellyfinUser.User.Id, jellyfinUser.User.Name),
            wasMadeAdmin: wasMadeAdmin,
        };
        session.isLoggedIn = true;
    
    await session.save();
    console.log("[Auth] Session cookie saved.");

    return NextResponse.json({ success: true, user: session.user, wasMadeAdmin });

    } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const { username } = await request.json().catch(() => ({ username: "unknown" }));
    console.error(`[Auth] Login Failed for user ${username}:`, errorMessage);
    
    // Check for specific Axios error response from Jellyfin
    if (axios.isAxiosError(error)) {
       if (error.response) {
         console.error("[Auth] Jellyfin Status:", error.response.status);
         console.error("[Auth] Jellyfin Data:", JSON.stringify(error.response.data));
         
         if (error.response.status === 401) {
             return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
         }
       } else if (error.request) {
         console.error("[Auth] No response from Jellyfin. Check JELLYFIN_URL.");
         console.error("[Auth] Request details:", error.config?.url);
       }
    }

    return NextResponse.json(
      { message: "Server connection failed or invalid credentials. Check Swiparr logs for details." },
      { status: 500 }
    );
  }
}
