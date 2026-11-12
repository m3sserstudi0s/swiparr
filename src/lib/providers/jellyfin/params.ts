import type { MediaKind } from "@/types/media";

/**
 * Pure request-shaping for the Jellyfin API, kept out of `index.ts` so the
 * mapping can be tested without axios or the Next runtime.
 */

/** Jellyfin's `IncludeItemTypes` value for a deck's kinds. */
export function toIncludeItemTypes(kinds?: MediaKind[]): string {
  if (!kinds || kinds.length === 0) return "Movie";
  const types = new Set<string>();
  for (const kind of kinds) {
    if (kind === "movie") types.add("Movie");
    else if (kind === "series") types.add("Series");
    else if (kind === "episode") types.add("Episode");
    // Seasons are never a deck unit; they are reached through a series.
  }
  // Jellyfin takes a comma-separated list; an empty set must not become "".
  return types.size > 0 ? [...types].join(",") : "Movie";
}

/**
 * Fields that must be requested explicitly — Jellyfin omits them otherwise, and
 * the zod schema strips anything it was not asked for.
 */
export const JELLYFIN_ITEM_FIELDS = [
  "Overview",
  "RunTimeTicks",
  "ProductionYear",
  "CommunityRating",
  "OfficialRating",
  "Genres",
  "ImageTags",
  "BackdropImageTags",
  "UserData",
  "PreferredMetadataLanguage",
  "ProductionLocations",
  "MediaStreams",
  "ProviderIds",
  // Shows
  "SeriesId",
  "SeriesName",
  "SeasonId",
  "SeasonName",
  "IndexNumber",
  "ParentIndexNumber",
  "ChildCount",
  "RecursiveItemCount",
  "Status",
  "EndDate",
  "PremiereDate",
].join(",");

/** Jellyfin item types that map onto a `MediaKind`. */
export function kindFromJellyfinType(type?: string): MediaKind | undefined {
  switch ((type ?? "").toLowerCase()) {
    case "movie":
      return "movie";
    case "series":
      return "series";
    case "season":
      return "season";
    case "episode":
      return "episode";
    default:
      return undefined;
  }
}
