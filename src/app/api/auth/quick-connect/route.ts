import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { initiateQuickConnect, checkQuickConnect } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";

export async function GET() {
  try {
    const deviceId = crypto.randomUUID();
    const data = await initiateQuickConnect(deviceId);
    
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.tempDeviceId = deviceId;
    await session.save();

    return NextResponse.json(data);
  } catch (error) {
    console.error("[QuickConnect] Error:", error);
    return NextResponse.json({ message: "Quick connect not available" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
    if (!session.tempDeviceId) {
      return NextResponse.json({ success: false, message: "No session found" }, { status: 400 });
    }

    const authData = await checkQuickConnect(secret, session.tempDeviceId);

    // If not yet authorized, authData will not contain AccessToken
    if (!authData.AccessToken || !authData.User?.Id) {
      return NextResponse.json({ success: false, message: "Pending" });
    }

    session.user = {
      Id: authData.User.Id,
      Name: authData.User.Name,
      AccessToken: authData.AccessToken,
      DeviceId: session.tempDeviceId,
    };
    session.isLoggedIn = true;
    delete session.tempDeviceId;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[QuickConnect] Auth error:", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}