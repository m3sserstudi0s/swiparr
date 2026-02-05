import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { initiateQuickConnect, checkQuickConnect } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { isAdmin, setAdminUserId } from "@/lib/server/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverUrl = searchParams.get("serverUrl") || undefined;
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
    console.error("[QuickConnect] Error initiating:", error.message);
    return NextResponse.json({ message: "Quick connect not available" }, { status: 500 });
  }
}

import { quickConnectSchema } from "@/lib/validations";

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

    // If not yet authorized, authData will not contain AccessToken
    if (!authData.AccessToken || !authData.User?.Id) {
      return NextResponse.json({ success: false, message: "Pending" });
    }

    // Set as admin if no admin exists
    const wasMadeAdmin = await setAdminUserId(authData.User.Id, "jellyfin");
    if (wasMadeAdmin) {
        console.log(`[QuickConnect] User ${authData.User.Name} (${authData.User.Id}) set as initial admin.`);
    }

    session.user = {
      Id: authData.User.Id,
      Name: authData.User.Name,
      AccessToken: authData.AccessToken,
      DeviceId: session.tempDeviceId,
      isAdmin: await isAdmin(authData.User.Id, authData.User.Name, "jellyfin"),
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
    console.error("[QuickConnect] Auth error:", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}