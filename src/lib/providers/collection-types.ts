/**
 * Which provider library sections the app can browse, in the app's own vocabulary.
 *
 * Jellyfin and Emby report `movies` and `tvshows`; Plex says `movie` and `show` and
 * the Plex adapter translates to these values. Sections of any other type (music,
 * photos, home videos) carry no cards the swipe deck can show, so they are not
 * offered in Admin → Libraries.
 */
export const BROWSEABLE_COLLECTION_TYPES = ["movies", "tvshows"] as const;

export type BrowseableCollectionType = (typeof BROWSEABLE_COLLECTION_TYPES)[number];

export function isBrowseableCollectionType(type?: string | null): boolean {
  return !!type && (BROWSEABLE_COLLECTION_TYPES as readonly string[]).includes(type);
}

/** Human label for a library section, for settings screens. */
export function collectionTypeLabel(type?: string | null): string {
  if (type === "movies") return "Movies";
  if (type === "tvshows") return "Shows";
  return type ?? "";
}
