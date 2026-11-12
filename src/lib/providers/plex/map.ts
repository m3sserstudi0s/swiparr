import type { MediaItem } from "@/types/media";
import { kindFromPlexType } from "./params";

/**
 * Pure mapping from a Plex metadata payload to a MediaItem.
 *
 * Kept free of HTTP and Next runtime so the fixtures in `map.test.ts` exercise
 * exactly what production runs. Plex addresses content by numeric `type`
 * (1 movie · 2 show · 3 season · 4 episode) and reports watch progress as
 * counted leaves — `leafCount` episodes of which `viewedLeafCount` are seen —
 * rather than Jellyfin's unplayed count.
 */
export function mapPlexItem(item: any): MediaItem {
  const languageTags: string[] = [];

  if (item.Language) {
    languageTags.push(...item.Language.map((l: any) => l.tag).filter(Boolean));
  }

  if (item.Media) {
    for (const media of item.Media) {
      for (const part of media.Part || []) {
        for (const stream of part.Stream || []) {
          if (stream.languageCode) languageTags.push(stream.languageCode);
          if (stream.language) languageTags.push(stream.language);
          if (stream.title) languageTags.push(stream.title);
        }
      }
    }
  }

  const language = languageTags.length > 0 ? languageTags[0] : undefined;

  const directorPeople = item.Director?.map((d: any, idx: number) => ({
    Id: `director-${item.ratingKey}-${idx}`,
    Name: d.tag,
    Role: "Director",
    Type: "Director",
  })) || [];

  const castPeople = item.Role?.map((r: any, idx: number) => ({
    Id: (r.id ? r.id.toString() : `cast-${item.ratingKey}-${idx}`),
    Name: r.tag,
    Role: r.role || "Actor",
    Type: "Actor",
    PrimaryImageTag: r.thumb,
  })) || [];

  const watchlistGuid = item.guid || (item.Guid?.[0]?.id ?? undefined);
  const isWatchlisted = (item.userState?.watchlistedAt ?? 0) > 0;
  const isPlayed = (item.viewCount ?? 0) > 0 || (item.viewOffset ?? 0) > 0 || (item.lastViewedAt ?? 0) > 0;

  const ratingImage = item.ratingImage || item.audienceRatingImage;
  const ratingSource = typeof ratingImage === "string" ? ratingImage.toLowerCase() : "";
  const hasImdbRating = ratingSource.includes("imdb");
  const communityRating = hasImdbRating
    ? item.rating
    : (item.audienceRating ?? item.rating);


  const kind = kindFromPlexType(item.type) ?? "movie";
  const isSeriesChild = kind === "season" || kind === "episode";
  const episodeCount = item.leafCount;
  const watchedCount = item.viewedLeafCount;

  /**
   * Plex reports progress two different ways: a series carries counted leaves
   * (`leafCount` episodes, `viewedLeafCount` seen), while a single video carries
   * `viewOffset`/`viewCount`. Both surface as the same MediaItem.Progress.
   */
  const progress = ((): MediaItem["Progress"] => {
    const positionTicks = typeof item.viewOffset === "number" && item.viewOffset > 0
      ? item.viewOffset * 10000
      : undefined;

    if (typeof watchedCount === "number" && typeof episodeCount === "number") {
      return {
        played: watchedCount >= episodeCount && episodeCount > 0,
        unplayedCount: Math.max(episodeCount - watchedCount, 0),
        positionTicks,
      };
    }

    if (typeof item.viewCount === "number" || positionTicks !== undefined) {
      return { played: (item.viewCount ?? 0) > 0, positionTicks };
    }

    return undefined;
  })();

  return {
    Id: item.ratingKey,
    Kind: kind,
    Guid: watchlistGuid,
    Name: item.title,
    SeriesId: isSeriesChild ? item.grandparentRatingKey ?? item.parentRatingKey : undefined,
    // A season's show is its parent; an episode's show is its grandparent.
    SeriesName: kind === "season" ? item.parentTitle : kind === "episode" ? item.grandparentTitle : undefined,
    SeasonNumber: kind === "episode" ? item.parentIndex : item.index,
    EpisodeNumber: kind === "episode" ? item.index : undefined,
    SeasonCount: kind === "series" ? item.childCount : undefined,
    EpisodeCount: typeof episodeCount === "number" ? episodeCount : undefined,
    Progress: progress,
    OriginalTitle: item.originalTitle,
    Language: language,
    RunTimeTicks: item.duration ? item.duration * 10000 : undefined, 
    ProductionYear: item.year,
    CommunityRating: communityRating,
    CommunityRatingSource: ratingImage,
    Overview: item.summary,
    Taglines: item.tagline ? [item.tagline] : [],
    OfficialRating: item.contentRating,
    Genres: item.Genre?.map((g: any) => g.tag) || [],
    People: [...castPeople, ...directorPeople],
    ImageTags: {
      Primary: item.thumb,
      Backdrop: item.art,
    },
    BackdropImageTags: item.art ? [item.art] : [],
    UserData: item.userRating !== undefined || isWatchlisted || isPlayed
      ? {
          IsFavorite: item.userRating > 0,
          Likes: isWatchlisted,
          Played: isPlayed,
        }
      : undefined,
  };
}
