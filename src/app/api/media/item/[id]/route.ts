import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { db, likes, sessionMembers } from "@/lib/db";
import { eq, and, isNull, or } from "drizzle-orm";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { ProviderType } from "@/lib/providers/types";
import { resolveItemSource, isTmdbSourcedId, getTmdbProviderId } from "@/lib/providers/item-source";
import { getEffectiveCapabilities } from "@/lib/runtime-config";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const sessionCodeQuery = searchParams.get("sessionCode");
  const includeUserState = searchParams.get("includeUserState") !== "0";

  // Determine which session code to use for looking up likes
  // 1. Explicit query param (important for distinguishing solo vs session likes in lists)
  // 2. Fallback to current session code if none provided
  const targetSessionCode = sessionCodeQuery !== null 
    ? (sessionCodeQuery === "" ? null : sessionCodeQuery)
    : (session.sessionCode || null);

  try {
    const auth = await AuthService.getEffectiveCredentials(session);
    // Hybrid decks contain tmdb:-prefixed streaming-only items - dispatch those to TMDB
    const { providerType, externalId } = resolveItemSource(id, auth.provider || ProviderType.JELLYFIN);
    const provider = getMediaProvider(providerType);
    const item = await provider.getItemDetails(externalId, auth, { includeUserState });
    // Keep the prefixed id: likes/swipes/undo on the client are keyed by it
    item.Id = id;

    const hybridCapable = auth.provider === ProviderType.JELLYFIN
      && getEffectiveCapabilities(ProviderType.JELLYFIN).hasStreamingSettings;

    if (isTmdbSourcedId(id)) {
      item.InLibrary = false;
    } else if (hybridCapable) {
      item.InLibrary = true;
      // Enrich library items with streaming availability (one TMDB call, non-fatal)
      const tmdbId = getTmdbProviderId(item);
      if (tmdbId) {
        try {
          const tmdbDetails = await getMediaProvider(ProviderType.TMDB).getItemDetails(tmdbId, auth);
          item.WatchProviders = tmdbDetails.WatchProviders;
        } catch (error) {
          logger.debug("Failed to enrich library item with TMDB watch providers:", error);
        }
      }
    }

    const itemLikes = await db.select().from(likes).where(and(
        eq(likes.externalId, id),
        targetSessionCode 
            ? eq(likes.sessionCode, targetSessionCode)
            : isNull(likes.sessionCode)
    ));

    if (itemLikes.length > 0) {
        if (targetSessionCode) {
            const members = await db.select().from(sessionMembers).where(eq(sessionMembers.sessionCode, targetSessionCode));
            
            item.likedBy = itemLikes.map((l: any) => ({
                userId: l.externalUserId,
                userName: members.find((m: any) => m.externalUserId === l.externalUserId)?.externalUserName || "Unknown",
                sessionCode: l.sessionCode
            }));
        } else {
            // Solo mode: only show if the CURRENT user liked it
            const myLike = itemLikes.find((l: any) => l.externalUserId === session.user.Id);
            if (myLike) {
                item.likedBy = [{
                    userId: session.user.Id,
                    userName: session.user.Name,
                    sessionCode: null
                }];
            } else {
                item.likedBy = [];
            }
        }
    } else {
        item.likedBy = [];
    }

    // Add sessionCode to the item so the UI knows the context it was fetched for
    (item as any).sessionCode = targetSessionCode;

    item.BlurDataURL = await provider.getBlurDataUrl(externalId, "Primary", auth);

    if (!includeUserState && item.UserData) {
      item.UserData = undefined;
    }

    return NextResponse.json(item);
  } catch (error) {
    return handleApiError(error, "Failed to fetch item details");
  }
}
