import { kindFromId } from "@/lib/providers/item-source";
import { MediaItem, MediaKind } from "@/types/media";

/**
 * Media kinds, normalized in one place.
 *
 * The content model was movies-only until 2.0, so "no kind" is a real state on
 * every existing row and item payload. It means movie, not unknown — do not
 * scatter `?? "movie"` fallbacks through the app; call `itemKind()`.
 */

export const MEDIA_KINDS: readonly MediaKind[] = ["movie", "series", "season", "episode"];
export const DEFAULT_MEDIA_KIND: MediaKind = "movie";

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === "string" && (MEDIA_KINDS as readonly string[]).includes(value);
}

/** Kind of an item payload; absent/invalid means movie. */
export function itemKind(item?: Pick<MediaItem, "Kind"> | null): MediaKind {
  const kind = item?.Kind;
  return isMediaKind(kind) ? kind : DEFAULT_MEDIA_KIND;
}

/**
 * Kind to store on a swipe. The item payload wins (the client sends the card it
 * swiped), then the typed id prefix, then movie. Never throws on a partial
 * payload: the swipe route forwards whatever the client posted.
 */
export function resolveSwipeKind(item: unknown, id: string): MediaKind {
  if (item && typeof item === "object") {
    const kind = (item as { Kind?: unknown }).Kind;
    if (isMediaKind(kind)) return kind;
  }
  return kindFromId(id) ?? DEFAULT_MEDIA_KIND;
}
