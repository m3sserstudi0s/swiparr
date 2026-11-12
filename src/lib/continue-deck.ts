import type { MediaItem } from "@/types/media";

/**
 * Pure pieces of the Continue and Episodes decks.
 *
 * Both answer "what am I in the middle of", so they share one source — the
 * provider's next-up shelf — and differ only in what they offer from it: one
 * episode per show, or every unwatched episode of those shows. The branching is
 * kept here so it can be tested without a database or a provider.
 */

export type ContinuationMode = "continue" | "episodes";

/** Whether a provider can serve a continuation deck at all. */
export function canServeContinuation(mode: ContinuationMode, capabilities: { hasNextUp?: boolean; hasProgress?: boolean }): boolean {
  if (!capabilities?.hasNextUp) return false;
  // Continue shows "the episode you are on", which is meaningless without
  // watched state; Episodes can still list unwatched ones.
  if (mode === "continue") return capabilities.hasProgress !== false;
  return true;
}

export function slicePage<T>(items: T[], page: number, limit: number): { items: T[]; hasMore: boolean } {
  const start = Math.max(page, 0) * Math.max(limit, 1);
  return { items: items.slice(start, start + limit), hasMore: items.length > start + limit };
}

/** Next-up entries the user has not already swiped. */
export function excludeSwiped(items: MediaItem[], excludeIds: Set<string>): MediaItem[] {
  return items.filter((item) => !excludeIds.has(item.Id));
}

/**
 * Distinct shows behind a next-up shelf, in first-seen order. Bounded because
 * every entry becomes a request when the episodes deck expands them.
 */
export function seriesIdsFromNextUp(items: MediaItem[], max = 5): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.SeriesId) seen.add(item.SeriesId);
    if (seen.size >= max) break;
  }
  return Array.from(seen);
}

/** Episodes that are neither watched nor already swiped. */
export function unwatchedEpisodes(episodes: MediaItem[], excludeIds: Set<string>): MediaItem[] {
  return episodes.filter((episode) => {
    if (episode.UserData?.Played) return false;
    if (episode.Progress?.played) return false;
    return !excludeIds.has(episode.Id);
  });
}
