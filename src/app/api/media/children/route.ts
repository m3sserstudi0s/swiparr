import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { handleApiError } from "@/lib/api-utils";

/**
 * Seasons or episodes of one series, for the detail view and the episode deck.
 * Jellyfin/Emby/Plex answer through their provider's `getChildren`; a provider
 * without series support says so instead of returning an empty list.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get("seriesId");
  if (!seriesId) {
    return NextResponse.json({ error: "seriesId is required" }, { status: 400 });
  }

  const kind = searchParams.get("kind") === "season" ? "season" : "episode";
  const seasonParam = searchParams.get("season");
  const season = seasonParam === null || seasonParam === "" ? undefined : Number(seasonParam);
  if (season !== undefined && !Number.isInteger(season)) {
    return NextResponse.json({ error: "season must be an integer" }, { status: 400 });
  }

  try {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);

    if (!provider.getChildren) {
      return NextResponse.json(
        { error: "This provider does not support series yet", code: "no_series_support" },
        { status: 501 }
      );
    }

    const items = await provider.getChildren(seriesId, kind, auth, season === undefined ? undefined : { season });

    // Air order, not server order: season then episode.
    if (kind === "episode") {
      items.sort(
        (a, b) =>
          (a.SeasonNumber ?? 0) - (b.SeasonNumber ?? 0) ||
          (a.EpisodeNumber ?? 0) - (b.EpisodeNumber ?? 0)
      );
    } else {
      items.sort((a, b) => (a.SeasonNumber ?? 0) - (b.SeasonNumber ?? 0));
    }

    return NextResponse.json({ kind, items });
  } catch (error) {
    return handleApiError(error, "Failed to fetch series children");
  }
}
