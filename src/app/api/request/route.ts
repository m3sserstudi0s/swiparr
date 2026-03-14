import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { z } from "zod";
import { db } from "@/lib/db";
import { pendingRequests, PendingRequest } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const requestBodySchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Note: Seerr config is checked at approval time, not here
    const rawBody = await request.json();
    const parsed = requestBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }
    const { itemId, itemName } = parsed.data;

    const isTv = itemId.startsWith("tv-");
    const tmdbId = isTv ? parseInt(itemId.replace("tv-", ""), 10) : parseInt(itemId, 10);
    const mediaType = isTv ? "tv" : "movie";

    if (isNaN(tmdbId)) {
      return NextResponse.json({ error: "Non-TMDB items cannot be requested" }, { status: 400 });
    }

    // Check for existing pending request from this user for this item
    const existingRows: PendingRequest[] = await db
      .select()
      .from(pendingRequests)
      .where(
        and(
          eq(pendingRequests.itemId, itemId),
          eq(pendingRequests.requestedBy, session.user.Id),
          eq(pendingRequests.status, "pending")
        )
      );
    const existing = existingRows[0];

    if (existing) {
      return NextResponse.json({ success: true, alreadyQueued: true });
    }

    await db.insert(pendingRequests).values({
      itemId,
      itemName: itemName ?? null,
      mediaType,
      tmdbId,
      requestedBy: session.user.Id,
      requestedByName: session.user.Name ?? null,
      status: "pending",
    });

    return NextResponse.json({ success: true, queued: true });
  } catch (err) {
    console.error(`[Request] Error:`, err);
    return NextResponse.json({ error: "Failed to queue request" }, { status: 500 });
  }
}
