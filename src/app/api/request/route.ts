import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { config } from "@/lib/config";
import { z } from "zod";

const requestBodySchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!config.SEERR_URL || !config.SEERR_API_KEY) {
    return NextResponse.json({ error: "Seerr not configured" }, { status: 503 });
  }

  try {
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

    const res = await fetch(`${config.SEERR_URL}/api/v1/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": config.SEERR_API_KEY,
      },
      body: JSON.stringify({ mediaType, mediaId: tmdbId }),
    });

    if (!res.ok) {
      const text = await res.text();
      // 409 means already requested — treat as success
      if (res.status === 409) {
        return NextResponse.json({ success: true, alreadyRequested: true });
      }
      console.warn(`[SeerrRequest] Failed for "${itemName}" (${itemId}): ${res.status} ${text}`);
      return NextResponse.json({ error: `Seerr returned ${res.status}` }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[SeerrRequest] Error:`, err);
    return NextResponse.json({ error: "Failed to contact Seerr" }, { status: 502 });
  }
}
