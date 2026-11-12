import type { MediaItem } from "@/types/media";

/**
 * Where a series sits for a user, derived from Jellyfin/Emby's series row:
 * `RecursiveItemCount` (episodes) minus `UserData.UnplayedItemCount`.
 */

export type SeriesWatchState = "notStarted" | "inProgress" | "finished" | "unknown";

export function seriesWatchState(item: Pick<MediaItem, "EpisodeCount" | "Progress">): SeriesWatchState {
  const total = item.EpisodeCount;
  const unplayed = item.Progress?.unplayedCount;
  // Without both numbers there is no honest answer — never guess "not started",
  // that would put half-watched shows back at S1E1.
  if (typeof total !== "number" || total <= 0 || typeof unplayed !== "number") return "unknown";
  if (unplayed >= total) return "notStarted";
  if (unplayed <= 0) return "finished";
  return "inProgress";
}

/** Deck filter for `SearchFilters.started`; movies always pass. */
export function matchesStartedFilter(
  item: Pick<MediaItem, "Kind" | "EpisodeCount" | "Progress">,
  started: "any" | "notStarted" | "inProgress"
): boolean {
  if (started === "any" || item.Kind !== "series") return true;
  const state = seriesWatchState(item);
  if (state === "unknown") return true; // no progress data: keep the card, no false negatives
  if (started === "notStarted") return state === "notStarted";
  return state === "inProgress";
}
