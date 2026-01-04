import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { authenticatePlex, verifyPlexServer } from "@/lib/plex/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { isAdmin, setAdminUserId } from "@/lib/server/admin";
import axios from "axios";

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();
        
        // Create a unique client ID for this user
        const clientId = `swiparr-${crypto.randomUUID()}`;

        // Log the attempt (Don't log the password!)
        console.log(`[Auth] Attempting Plex login for user: ${username}`);

        // Authenticate with plex.tv
        const plexUser = await authenticatePlex(username, password, clientId);
        console.log("[Auth] Plex.tv accepted credentials. User ID:", plexUser.id);

        // Verify the user can access the configured Plex server
        try {
            await verifyPlexServer(plexUser.authToken);
            console.log("[Auth] Plex server connection verified.");
        } catch (serverError) {
            console.warn("[Auth] Could not verify Plex server connection. User may not have access.");
        }

        // Set as admin if no admin exists
        const wasMadeAdmin = await setAdminUserId(plexUser.id.toString());
        if (wasMadeAdmin) {
            console.log(`[Auth] User ${plexUser.username} (${plexUser.id}) set as initial admin.`);
        }

        const cookieStore = await cookies();
        const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

        session.user = {
            Id: plexUser.id.toString(),
            Name: plexUser.username || plexUser.title || plexUser.email,
            AccessToken: plexUser.authToken,
            DeviceId: clientId,
            isAdmin: await isAdmin(plexUser.id.toString(), plexUser.username),
            wasMadeAdmin: wasMadeAdmin,
            plexEmail: plexUser.email,
            plexThumb: plexUser.thumb,
        };
        session.isLoggedIn = true;
    
        await session.save();
        console.log("[Auth] Session cookie saved.");

        return NextResponse.json({ success: true, user: session.user, wasMadeAdmin });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Auth] Login Failed:`, errorMessage);
        
        // Check for specific Axios error response from Plex
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error("[Auth] Plex Status:", error.response.status);
                console.error("[Auth] Plex Data:", JSON.stringify(error.response.data));
                
                if (error.response.status === 401) {
                    return NextResponse.json({ message: "Invalid email/username or password" }, { status: 401 });
                }
            } else if (error.request) {
                console.error("[Auth] No response from Plex.tv. Check network connection.");
            }
        }

        return NextResponse.json(
            { message: "Authentication failed. Check your credentials." },
            { status: 500 }
        );
    }
}
