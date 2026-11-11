import { TMDB_MOVIE_ID_PREFIX, TMDB_TV_ID_PREFIX } from "@/lib/constants";
import { ProviderType } from "@/lib/providers/types";
import { MediaItem, MediaKind } from "@/types/media";

/**
 * Hybrid decks mix items from the session's library provider (Jellyfin) with
 * streaming-only items discovered via TMDB. Streaming-only items carry a typed
 * "tmdb:<kind>:" prefix so API routes can dispatch to the right provider while
 * DB rows (likes/hidden) keep the prefixed id as an opaque string.
 *
 * This module is the ONLY place that parses those typed ids. Library ids
 * (Jellyfin GUIDs, Emby GUIDs, Plex ratingKeys) are opaque and carry no kind —
 * their kind comes from the item payload, not the id.
 */

/** Typed prefix per streaming kind. Season/episode have no TMDB prefix of their own. */
const TMDB_PREFIX_BY_KIND: Partial<Record<MediaKind, string>> = {
  movie: TMDB_MOVIE_ID_PREFIX,
  series: TMDB_TV_ID_PREFIX,
};

/** Every prefix this app writes, longest-first so `tmdb:` never shadows a typed prefix. */
const KNOWN_PREFIXES: { prefix: string; kind: MediaKind }[] = [
  { prefix: TMDB_MOVIE_ID_PREFIX, kind: "movie" },
  { prefix: TMDB_TV_ID_PREFIX, kind: "series" },
];

export function tmdbPrefixForKind(kind: MediaKind | undefined): string | undefined {
  return kind ? TMDB_PREFIX_BY_KIND[kind] : undefined;
}

export function isTmdbSourcedId(id: string): boolean {
  return KNOWN_PREFIXES.some(({ prefix }) => id.startsWith(prefix));
}

/**
 * A typed streaming id. Falls back to the movie prefix for kinds TMDB does not
 * stream as a single unit (season/episode) rather than inventing a third prefix.
 */
export function toStreamingId(kind: MediaKind, tmdbId: string): string {
  return `${tmdbPrefixForKind(kind) ?? TMDB_MOVIE_ID_PREFIX}${tmdbId}`;
}

/** @deprecated use `toStreamingId(kind, id)`; kept because callers pass a bare movie id. */
export function toHybridStreamingId(tmdbId: string): string {
  return toStreamingId("movie", tmdbId);
}

/**
 * Kind encoded in an id. `undefined` for library ids: a Jellyfin GUID says
 * nothing about whether it is a movie or a series, so callers must not guess.
 */
export function kindFromId(id: string): MediaKind | undefined {
  return KNOWN_PREFIXES.find(({ prefix }) => id.startsWith(prefix))?.kind;
}

/** Bare TMDB id with any typed prefix stripped (library ids pass through). */
export function stripTypedPrefix(id: string): string {
  const match = KNOWN_PREFIXES.find(({ prefix }) => id.startsWith(prefix));
  return match ? id.slice(match.prefix.length) : id;
}

/** TMDB id from a library item's external provider ids (key casing varies per scraper). */
export function getTmdbProviderId(item: MediaItem): string | undefined {
  if (!item.ProviderIds) return undefined;
  for (const [key, value] of Object.entries(item.ProviderIds)) {
    if (key.toLowerCase() === "tmdb" && value) return value;
  }
  return undefined;
}

export function resolveItemSource(
  id: string,
  sessionProvider?: string
): { providerType: string | undefined; externalId: string; kind?: MediaKind } {
  const match = KNOWN_PREFIXES.find(({ prefix }) => id.startsWith(prefix));
  if (match) {
    return {
      providerType: ProviderType.TMDB,
      externalId: id.slice(match.prefix.length),
      kind: match.kind,
    };
  }
  return { providerType: sessionProvider, externalId: id };
}
