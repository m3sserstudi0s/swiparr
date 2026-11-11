import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { resolveStartHere, type EpisodeRef } from "@/lib/start-here";
import { handleApiError } from "@/lib/api-utils";

/**
 * Where to start a series after a match.
 *
 * Solo only for now, and honest about it: the only progress the server can vouch
 * for is the signed-in user's own. Group progress is host-only by design (guests
 * borrow the host's token), so a session caller gets `hostOnly: true` and the UI
 * must label it as the host's position, never "yours".
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

  try {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);

    if (!provider.getChildren) {
      return NextResponse.json(
        { error: "This provider does not support series yet", code: "no_series_support" },
        { status: 501 }
      );
    }

    const episodes = await provider.getChildren(seriesId, "episode", auth);
    episodes.sort(
      (a, b) =>
        (a.SeasonNumber ?? 0) - (b.SeasonNumber ?? 0) ||
        (a.EpisodeNumber ?? 0) - (b.EpisodeNumber ?? 0)
    );

    const refs: EpisodeRef[] = episodes.map((episode, index) => ({
      season: episode.SeasonNumber ?? 1,
      episode: episode.EpisodeNumber ?? index + 1,
    }));

    // Next unwatched = the first episode the server says is unplayed. Played
    // flags only; nothing is inferred from a resume position.
    const firstUnwatched = episodes.findIndex((episode) => !episode.Progress?.played);
    const nextUnwatchedIndex = firstUnwatched === -1 ? episodes.length : firstUnwatched;

    let status: "continuing" | "ended" | "upcoming" | undefined;
    try {
      const series = await provider.getItemDetails(seriesId, auth, { includeUserState: true });
      status = series.Status;
    } catch {
      // Status only sharpens the copy ("Series finished"); never fail on it.
    }

    const hostOnly = !!session.sessionCode;
    const startHere = resolveStartHere({
      episodes: refs,
      members: [
        {
          userId: session.user.Id,
          name: session.user.Name,
          isHost: true,
          nextUnwatchedIndex,
          borrowed: hostOnly,
        },
      ],
      status,
    });

    return NextResponse.json({
      startHere,
      episodeCount: episodes.length,
      hostOnly,
    });
  } catch (error) {
    return handleApiError(error, "Failed to resolve start-here");
  }
}
