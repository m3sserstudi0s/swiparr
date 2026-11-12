import { z } from 'zod';

/**
 * TMDB API Schemas
 * Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */
export const TmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  vote_average: z.number().optional(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number()).optional(),
  runtime: z.number().optional(),
  tagline: z.string().optional(),
});

/**
 * A series as it appears in list payloads (`discover/tv`, `search/tv`,
 * `trending/tv`). It has `name` instead of `title`, `first_air_date` instead of
 * `release_date`, and none of the detail-only counts — validating a TV response
 * with the movie schema throws "expected string, received undefined" on `title`,
 * which surfaces as a 500 rather than an empty deck.
 */
export const TmdbTvListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  first_air_date: z.string().optional().nullable(),
  last_air_date: z.string().optional().nullable(),
  vote_average: z.number().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  genre_ids: z.array(z.number()).optional(),
  origin_country: z.array(z.string()).optional(),
  status: z.string().optional(),
  number_of_seasons: z.number().optional(),
  number_of_episodes: z.number().optional(),
  episode_run_time: z.array(z.number()).optional(),
});

export const TmdbListItemSchema = z.union([TmdbTvListItemSchema, TmdbMovieSchema]);

export const TmdbSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(TmdbListItemSchema),
  total_pages: z.number(),
  total_results: z.number(),
});

/**
 * Jellyfin / Emby API Schemas
 * Jellyfin Docs: https://api.jellyfin.org/
 * Emby Docs: https://dev.emby.media/reference/restapi/ItemService.html
 */
export const JellyfinItemSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  // `Movie` | `Series` | `Season` | `Episode` | ... — the only reliable kind signal.
  Type: z.string().optional(),
  OriginalTitle: z.string().optional(),
  // Shows: parentage and counts. Jellyfin puts the season number in
  // ParentIndexNumber and the episode number in IndexNumber.
  SeriesId: z.string().optional(),
  SeriesName: z.string().optional(),
  SeasonId: z.string().optional(),
  SeasonName: z.string().optional(),
  IndexNumber: z.number().optional(),
  ParentIndexNumber: z.number().optional(),
  ChildCount: z.number().optional(),
  RecursiveItemCount: z.number().optional(),
  Status: z.string().optional(),
  EndDate: z.string().optional(),
  PremiereDate: z.string().optional(),
  SeriesPrimaryImageTag: z.string().optional(),
  RunTimeTicks: z.number().optional(),
  ProductionYear: z.number().optional(),
  CommunityRating: z.number().optional(),
  OfficialRating: z.string().optional(),
  Overview: z.string().optional(),
  Taglines: z.array(z.string()).optional(),
  Genres: z.array(z.string()).optional(),
  MediaStreams: z.array(z.object({
    Type: z.string().optional(),
    Language: z.string().optional(),
    IsDefault: z.boolean().optional(),
  })).optional(),
  PreferredMetadataLanguage: z.string().optional(),
  ProductionLocations: z.array(z.string()).optional(),
  ImageTags: z.record(z.string(), z.string()).optional(),
  BackdropImageTags: z.array(z.string()).optional(),
  ProviderIds: z.record(z.string(), z.string()).optional(),
  UserData: z.object({
    IsFavorite: z.boolean().optional(),
    Likes: z.boolean().optional(),
    Played: z.boolean().optional(),
    // Series progress: Played=false + UnplayedItemCount on the series row.
    UnplayedItemCount: z.number().optional(),
    PlaybackPositionTicks: z.number().optional(),
    LastPlayedDate: z.string().optional(),
  }).optional(),
  People: z.array(z.object({
    Name: z.string(),
    Id: z.string(),
    Role: z.string().optional(),
    Type: z.string().optional(),
    PrimaryImageTag: z.string().optional(),
  })).optional(),
});

export const JellyfinQueryResultSchema = z.object({
  Items: z.array(JellyfinItemSchema),
  TotalRecordCount: z.number().optional(),
});

/**
 * Plex API Schemas
 * Plex doesn't have an official OpenAPI, but follows a structured XML-to-JSON pattern.
 */
export const PlexMetadataSchema = z.object({
  ratingKey: z.string(),
  key: z.string(),
  title: z.string(),
  guid: z.string().optional(),
  Guid: z.array(z.object({ id: z.string() })).optional(),
  viewCount: z.number().optional(),
  viewOffset: z.number().optional(),
  lastViewedAt: z.number().optional(),
  userState: z.object({
    watchlistedAt: z.number().optional(),
  }).optional(),
  originalTitle: z.string().optional(),
  summary: z.string().optional(),
  year: z.number().optional(),
  rating: z.number().optional(),
  audienceRating: z.number().optional(),
  audienceRatingImage: z.string().optional(),
  ratingImage: z.string().optional(),
  userRating: z.number().optional(),
  contentRating: z.string().optional(),
  duration: z.number().optional(),
  thumb: z.string().optional(),
  art: z.string().optional(),
  tagline: z.string().optional(),
  Genre: z.array(z.object({ tag: z.string() })).optional(),
  Director: z.array(z.object({ tag: z.string() })).optional(),
  Role: z.array(z.object({ tag: z.string(), role: z.string().optional(), id: z.number().optional(), thumb: z.string().optional() })).optional(),
  Language: z.array(z.object({ tag: z.string() })).optional(),
  Country: z.array(z.object({ tag: z.string() })).optional(),
  // Series/season/episode shape (Plex: 1 movie, 2 show, 3 season, 4 episode)
  type: z.union([z.number(), z.string()]).optional(),
  index: z.number().optional(),
  parentIndex: z.number().optional(),
  parentTitle: z.string().optional(),
  grandparentTitle: z.string().optional(),
  parentRatingKey: z.string().optional(),
  grandparentRatingKey: z.string().optional(),
  leafCount: z.number().optional(),
  viewedLeafCount: z.number().optional(),
  childCount: z.number().optional(),
  originallyAvailableAt: z.string().optional(),
  addedAt: z.number().optional(),
  Media: z.array(z.object({
    Part: z.array(z.object({
      Stream: z.array(z.object({
        language: z.string().optional(),
        languageCode: z.string().optional(),
        title: z.string().optional(),
        streamType: z.number().optional(),
      })).optional(),
    })).optional(),
  })).optional(),
});

/**
 * A child entry may be a pseudo-node rather than an item: `/library/metadata/{id}/children`
 * on a show returns an "All episodes" directory (key `/allLeaves`) with no
 * `ratingKey`, so the child arrays accept a missing id and the caller filters.
 */
export const PlexChildSchema = PlexMetadataSchema.extend({
  ratingKey: z.string().optional(),
});

export const PlexContainerSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    // Plex names the child array after the element it holds: /children returns
    // Directory (seasons) or Video (episodes), list endpoints return Metadata.
    Metadata: z.array(PlexMetadataSchema).optional(),
    Directory: z.array(PlexChildSchema).optional(),
    Video: z.array(PlexChildSchema).optional(),
  }),
});
