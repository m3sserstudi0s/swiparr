import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { db } from "@/lib/db";
import { pendingRequests, PendingRequest } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const rowId = parseInt(id, 10);

  const rows: PendingRequest[] = await db
    .select()
    .from(pendingRequests)
    .where(eq(pendingRequests.id, rowId));
  const row = rows[0];

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "pending") return NextResponse.json({ error: "Already resolved" }, { status: 409 });

  await db
    .update(pendingRequests)
    .set({ status: "denied", resolvedAt: new Date().toISOString() })
    .where(eq(pendingRequests.id, rowId));

  return NextResponse.json({ success: true });
}
