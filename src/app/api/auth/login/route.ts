import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { isAdmin, setAdminUserId } from "@/lib/server/admin";
import axios from "axios";
import { loginSchema } from "@/lib/validations";
import { getMediaProvider } from "@/lib/providers/factory";

export async function POST(request: NextRequest) {
    let usernameForLog = "unknown";
    try {
        const body = await request.json();
        const validated = loginSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json({ message: "Invalid input" }, { status: 400 });
        }

        const { username, password, provider: bodyProvider, config: providerConfig } = validated.data;
        usernameForLog = username;

        const baseDeviceId = crypto.randomUUID();
        const deviceId = `${baseDeviceId}-${username}`;

        console.log(`[Auth] Attempting login for user: ${username} with deviceId: ${deviceId}`);

        const provider = getMediaProvider(bodyProvider);
        if (!provider.authenticate) {
            return NextResponse.json({ message: "Authentication not supported by this provider" }, { status: 400 });
        }

        const authResult = await provider.authenticate(username, password, deviceId, providerConfig?.serverUrl || providerConfig?.tmdbToken);
        
        // Jellyfin provider returns { User: { Id, Name }, AccessToken, ... }
        // We might need to normalize this in the provider or handle it here
        // For now, I'll assume the provider returns a standard object or I'll adapt it in JellyfinProvider
        
        const userId = authResult.User?.Id || authResult.id;
        const userName = authResult.User?.Name || authResult.name;
        const accessToken = authResult.AccessToken || authResult.accessToken;

        console.log("[Auth] Provider accepted credentials. User ID:", userId);

        // Set as admin if no admin exists
        const wasMadeAdmin = await setAdminUserId(userId);
        if (wasMadeAdmin) {
            console.log(`[Auth] User ${userName} (${userId}) set as initial admin.`);
        }

        const cookieStore = await cookies();
        const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

        session.user = {
            Id: userId,
            Name: userName,
            AccessToken: accessToken,
            DeviceId: deviceId,
            isAdmin: await isAdmin(userId, userName),
            wasMadeAdmin: wasMadeAdmin,
            provider: bodyProvider || provider.name,
            providerConfig: providerConfig,
        };
        session.isLoggedIn = true;
    
    await session.save();
    console.log("[Auth] Session cookie saved.");

    return NextResponse.json({ success: true, user: session.user, wasMadeAdmin });

    } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Auth] Login Failed for user ${usernameForLog}:`, errorMessage);

    
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
