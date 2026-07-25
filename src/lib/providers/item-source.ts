import { TMDB_ID_PREFIX } from "@/lib/constants";
import { ProviderType } from "@/lib/providers/types";
import { MediaItem } from "@/types/media";

/**
 * Hybrid decks mix items from the session's library provider (Jellyfin) with
 * streaming-only items discovered via TMDB. Streaming-only items carry a
 * "tmdb:"-prefixed id so API routes can dispatch to the right provider while
 * DB rows (likes/hidden) keep the prefixed id as an opaque string.
 */

export function isTmdbSourcedId(id: string): boolean {
  return id.startsWith(TMDB_ID_PREFIX);
}

export function toHybridStreamingId(tmdbId: string): string {
  return `${TMDB_ID_PREFIX}${tmdbId}`;
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
): { providerType: string | undefined; externalId: string } {
  if (isTmdbSourcedId(id)) {
    return { providerType: ProviderType.TMDB, externalId: id.slice(TMDB_ID_PREFIX.length) };
  }
  return { providerType: sessionProvider, externalId: id };
}
