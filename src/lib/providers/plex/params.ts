import type { MediaKind } from "@/types/media";

/**
 * Plex addresses content by numeric `type` ids on every list endpoint rather
 * than by a name, so the translation lives in one place.
 *
 * 1 movie · 2 show · 3 season · 4 episode
 */
export const PLEX_TYPE_BY_KIND: Record<MediaKind, number> = {
  movie: 1,
  series: 2,
  season: 3,
  episode: 4,
};

export const PLEX_KIND_BY_TYPE: Record<number, MediaKind> = {
  1: "movie",
  2: "series",
  3: "season",
  4: "episode",
};

/** Plex's own `type` attribute is a string in XML ("show") and a number in JSON. */
export function plexTypeOf(kind: MediaKind): number {
  return PLEX_TYPE_BY_KIND[kind];
}

/**
 * Resolves an item's kind from either representation Plex uses: the numeric
 * `type` field of JSON payloads, or the string form that appears in XML-derived
 * fixtures. Unknown values fall back to undefined so the caller can decide.
 */
export function kindFromPlexType(type: number | string | undefined): MediaKind | undefined {
  if (typeof type === "number") return PLEX_KIND_BY_TYPE[type];
  if (typeof type === "string") {
    const numeric = Number(type);
    if (!Number.isNaN(numeric) && PLEX_KIND_BY_TYPE[numeric]) return PLEX_KIND_BY_TYPE[numeric];
    const normalized = type.toLowerCase();
    if (normalized === "movie") return "movie";
    if (normalized === "show" || normalized === "series") return "series";
    if (normalized === "season") return "season";
    if (normalized === "episode") return "episode";
  }
  return undefined;
}

/** The Plex section `type` values that hold each kind we can browse. */
export function plexSectionTypeForKind(kind: MediaKind): "movie" | "show" | undefined {
  if (kind === "movie") return "movie";
  if (kind === "series" || kind === "season" || kind === "episode") return "show";
  return undefined;
}
