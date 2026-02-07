import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { SessionService } from "@/lib/services/session-service";

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (session.user?.Id && session.sessionCode) {
    try {
        await SessionService.leaveSession(session.user, session.sessionCode);
    } catch (e) {
        console.error("Failed to leave session during logout", e);
    }
  }

  session.destroy();

  return NextResponse.json({ success: true });
}
