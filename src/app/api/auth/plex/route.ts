import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";
import { handleApiError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { getBestServerUrl, getPlexHeaders, assertSafePlexServerUrl } from "@/lib/plex/api";
import axios from "axios";
import { ProviderType } from "@/lib/providers/types";
import { plexAuthSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const bodyRaw = await request.json();
    const parsed = plexAuthSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid authToken / clientId" },
        { status: 400 }
      );
    }
    const { authToken, clientId } = parsed.data;

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    // Always fetch user identity server-side from plex.tv — never trust client-supplied user data.
    let userInfo;
    try {
      const response = await axios.get("https://plex.tv/api/v2/user", {
        headers: getPlexHeaders(authToken, clientId),
      });
      userInfo = response.data;
    } catch (err) {
      logger.error("[PlexAuth] Failed to fetch user info:", err);
      return NextResponse.json(
        { success: false, message: "Failed to verify Plex token" },
        { status: 401 }
      );
    }

    // Validate the user-supplied server URL against DNS-resolved IPs (M9).
    if (session.providerConfig?.serverUrl) {
      try {
        await assertSafePlexServerUrl(session.providerConfig.serverUrl);
      } catch {
        return NextResponse.json(
          { success: false, message: "Provided server URL is not allowed" },
          { status: 400 }
        );
      }
    }

    // Try to discover the best server URL
    const discovered = await getBestServerUrl(authToken, session.providerConfig?.serverUrl, clientId);
    const effectiveServerUrl = discovered?.serverUrl || session.providerConfig?.serverUrl;
    const effectiveMachineId = discovered?.machineId || session.providerConfig?.machineId;

    // Check if this should be the admin user
    const existingAdmin = await ConfigService.getAdminUserId(ProviderType.PLEX);
    let wasMadeAdmin = false;

    if (!existingAdmin) {
      await ConfigService.setAdminUserId(userInfo.uuid || userInfo.id, ProviderType.PLEX);
      wasMadeAdmin = true;
      logger.info(`[PlexAuth] User ${userInfo.username} set as initial admin.`);
    }

    session.user = {
      Id: userInfo.uuid || userInfo.id,
      Name: userInfo.username,
      AccessToken: discovered?.accessToken || authToken,
      DeviceId: clientId,
      isAdmin: await AuthService.isAdmin(userInfo.uuid || userInfo.id, userInfo.username, ProviderType.PLEX),
      wasMadeAdmin: wasMadeAdmin,
      provider: ProviderType.PLEX,
      providerConfig: effectiveServerUrl || effectiveMachineId
        ? { serverUrl: effectiveServerUrl, machineId: effectiveMachineId || undefined }
        : undefined,
    };
    session.isLoggedIn = true;
    
    // Clear any temp data
    delete session.tempDeviceId;
    delete session.tempPinId;
    delete session.providerConfig;
    
    await session.save();

    return NextResponse.json({ success: true, wasMadeAdmin });
  } catch (error) {
    logger.error("[PlexAuth] POST error:", error);
    return handleApiError(error, "Plex authentication failed");
  }
}
