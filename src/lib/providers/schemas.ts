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

export const TmdbSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(TmdbMovieSchema),
  total_pages: z.number(),
  total_results: z.number(),
});

export const TmdbTvShowSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  first_air_date: z.string().optional(),
  vote_average: z.number().optional(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number()).optional(),
  episode_run_time: z.array(z.number()).optional(),
  tagline: z.string().optional(),
});

export const TmdbTvSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(TmdbTvShowSchema),
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
  OriginalTitle: z.string().optional(),
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
  UserData: z.object({
    IsFavorite: z.boolean().optional(),
    Likes: z.boolean().optional(),
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
  originalTitle: z.string().optional(),
  summary: z.string().optional(),
  year: z.number().optional(),
  rating: z.number().optional(),
  contentRating: z.string().optional(),
  duration: z.number().optional(),
  thumb: z.string().optional(),
  art: z.string().optional(),
  tagline: z.string().optional(),
  Genre: z.array(z.object({ tag: z.string() })).optional(),
  Director: z.array(z.object({ tag: z.string() })).optional(),
  Role: z.array(z.object({ tag: z.string(), id: z.number().optional(), thumb: z.string().optional() })).optional(),
});

export const PlexContainerSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    Metadata: z.array(PlexMetadataSchema).optional(),
  }),
});
