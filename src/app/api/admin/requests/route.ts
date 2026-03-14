import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { db } from "@/lib/db";
import { pendingRequests } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = request.nextUrl.searchParams.get("status") ?? "pending";

  const rows = await db
    .select()
    .from(pendingRequests)
    .where(eq(pendingRequests.status, status))
    .orderBy(asc(pendingRequests.createdAt));

  return NextResponse.json(rows);
}
