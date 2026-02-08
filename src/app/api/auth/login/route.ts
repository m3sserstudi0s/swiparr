import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import axios from "axios";
import { loginSchema } from "@/lib/validations";
import { getMediaProvider } from "@/lib/providers/factory";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";

export async function POST(request: NextRequest) {
    let usernameForLog = "unknown";
    try {
        const body = await request.json();
        const validated = loginSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json({ message: "Invalid input" }, { status: 400 });
        }

        const { username, password, provider: bodyProvider, config: providerConfig, profilePicture } = validated.data;
        usernameForLog = username;

        const baseDeviceId = crypto.randomUUID();
        const deviceId = `${baseDeviceId}-${username}`;

        console.log(`[Auth] Attempting login for user: ${username} with deviceId: ${deviceId}`);

        const provider = getMediaProvider(bodyProvider);
        if (!provider.authenticate) {
            return NextResponse.json({ message: "Authentication not supported by this provider" }, { status: 400 });
        }

        const authResult = await provider.authenticate(username, password, deviceId, providerConfig?.serverUrl || providerConfig?.tmdbToken);
        
        const userId = authResult.User?.Id || authResult.id;
        const userName = authResult.User?.Name || authResult.name;
        const accessToken = authResult.AccessToken || authResult.accessToken;

        console.log("[Auth] Provider accepted credentials. User ID:", userId);

        // Set as admin if no admin exists for this provider
        const existingAdmin = await ConfigService.getAdminUserId(bodyProvider);
        let wasMadeAdmin = false;
        if (!existingAdmin) {
            await ConfigService.setAdminUserId(userId, bodyProvider as any);
            wasMadeAdmin = true;
            console.log(`[Auth] User ${userName} (${userId}) set as initial admin for ${bodyProvider}.`);
        }

        const cookieStore = await cookies();
        const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

        session.user = {
            Id: userId,
            Name: userName,
            AccessToken: accessToken,
            DeviceId: deviceId,
            isAdmin: await AuthService.isAdmin(userId, userName, bodyProvider),
            wasMadeAdmin: wasMadeAdmin,
            provider: bodyProvider || provider.name,
            providerConfig: providerConfig,
        };
        session.isLoggedIn = true;

        if (profilePicture) {
            try {
                const { saveProfilePicture } = await import("@/lib/server/profile-picture");
                const base64Data = profilePicture.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                await saveProfilePicture(userId, buffer, "image/webp");
            } catch (e) {
                console.error("[Auth] Failed to save profile picture:", e);
            }
        }
    
    await session.save();

    console.log("[Auth] Session cookie saved.");

    return NextResponse.json({ success: true, user: session.user, wasMadeAdmin });

    } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Auth] Login Failed for user ${usernameForLog}:`, errorMessage);

    if (axios.isAxiosError(error)) {
       if (error.response) {
         if (error.response.status === 401) {
             return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
         }
       }
    }

    return NextResponse.json(
      { message: "Server connection failed or invalid credentials. Check Swiparr logs for details." },
      { status: 500 }
    );
  }
}
