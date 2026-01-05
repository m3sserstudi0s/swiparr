import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { requestPlexPin, checkPlexPin, getPlexUser, verifyPlexServer } from "@/lib/plex/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { isAdmin, setAdminUserId } from "@/lib/server/admin";

// GET - Request a new PIN for Plex.tv authentication
export async function GET(request: NextRequest) {
    try {
        const clientId = `swiparr-${crypto.randomUUID()}`;
        
        console.log("[Auth] Requesting Plex PIN...");
        const pinData = await requestPlexPin(clientId);
        
        // Return PIN info for the user to enter at plex.tv/link
        return NextResponse.json({
            pin: pinData.code,
            pinId: pinData.id,
            clientId: clientId,
            expiresAt: pinData.expiresAt,
            // URL where user should go to authorize
            authUrl: `https://app.plex.tv/auth#?clientID=${clientId}&code=${pinData.code}&context%5Bdevice%5D%5Bproduct%5D=Swiparr`,
        });
    } catch (error) {
        console.error("[Auth] PIN request failed:", error);
        return NextResponse.json(
            { message: "Failed to request PIN" },
            { status: 500 }
        );
    }
}

// POST - Check if PIN has been authorized and complete login
export async function POST(request: NextRequest) {
    try {
        const { pinId, clientId } = await request.json();
        
        if (!pinId || !clientId) {
            return NextResponse.json({ message: "Missing pinId or clientId" }, { status: 400 });
        }

        console.log("[Auth] Checking Plex PIN status...");
        const pinStatus = await checkPlexPin(pinId, clientId);
        
        // PIN not yet claimed
        if (!pinStatus.authToken) {
            return NextResponse.json({ 
                authorized: false, 
                message: "PIN not yet authorized" 
            });
        }

        // PIN has been claimed - get user info
        const plexUser = await getPlexUser(pinStatus.authToken, clientId);
        console.log("[Auth] PIN authorized. User:", plexUser.username);

        // Verify the user can access the configured Plex server
        try {
            await verifyPlexServer(pinStatus.authToken);
            console.log("[Auth] Plex server connection verified.");
        } catch (serverError) {
            console.warn("[Auth] Could not verify Plex server connection.");
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
            AccessToken: pinStatus.authToken,
            DeviceId: clientId,
            isAdmin: await isAdmin(plexUser.id.toString(), plexUser.username),
            wasMadeAdmin: wasMadeAdmin,
            plexEmail: plexUser.email,
            plexThumb: plexUser.thumb,
        };
        session.isLoggedIn = true;
    
        await session.save();
        console.log("[Auth] Session cookie saved.");

        return NextResponse.json({ 
            authorized: true,
            success: true, 
            user: session.user, 
            wasMadeAdmin 
        });

    } catch (error) {
        console.error("[Auth] PIN check failed:", error);
        return NextResponse.json(
            { message: "Failed to check PIN status" },
            { status: 500 }
        );
    }
}
