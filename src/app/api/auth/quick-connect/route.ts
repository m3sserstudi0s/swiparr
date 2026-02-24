import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { initiateQuickConnect, checkQuickConnect } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";
import { quickConnectSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-utils";
import { assertSafeUrl } from "@/lib/security/url-guard";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverUrl = searchParams.get("serverUrl") || undefined;
    if (serverUrl) {
      const source = config.app.providerLock ? "env" : "user";
      assertSafeUrl(serverUrl, { source });
    }
    const deviceId = crypto.randomUUID();
    const data = await initiateQuickConnect(deviceId, serverUrl);
    
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    session.tempDeviceId = deviceId;
    if (serverUrl) {
        session.providerConfig = { serverUrl };
    }
    await session.save();

    return NextResponse.json(data);
  } catch (error: any) {
    return handleApiError(error, "Quick connect not available");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = quickConnectSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
    
    const { secret } = validated.data;

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
    
    if (!session.tempDeviceId) {
      return NextResponse.json({ success: false, message: "No session found" }, { status: 400 });
    }

    const authData = await checkQuickConnect(secret, session.tempDeviceId, session.providerConfig?.serverUrl);

    if (!authData.AccessToken || !authData.User?.Id) {
      return NextResponse.json({ success: false, message: "Pending" });
    }

    const existingAdmin = await ConfigService.getAdminUserId("jellyfin");
    let wasMadeAdmin = false;
    if (!existingAdmin) {
        await ConfigService.setAdminUserId(authData.User.Id, "jellyfin" as any);
        wasMadeAdmin = true;
        logger.info(`[QuickConnect] User ${authData.User.Name} (${authData.User.Id}) set as initial admin.`);
    }

    session.user = {
      Id: authData.User.Id,
      Name: authData.User.Name,
      AccessToken: authData.AccessToken,
      DeviceId: session.tempDeviceId,
      isAdmin: await AuthService.isAdmin(authData.User.Id, authData.User.Name, "jellyfin"),
      wasMadeAdmin: wasMadeAdmin,
      provider: "jellyfin",
      providerConfig: session.providerConfig,
    };
    session.isLoggedIn = true;
    delete session.tempDeviceId;
    delete session.providerConfig;
    await session.save();

    return NextResponse.json({ success: true, wasMadeAdmin });
  } catch (error) {
    return handleApiError(error, "Quick connect auth failed");
  }
}
