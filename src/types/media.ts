export interface MediaPerson {
  Name: string;
  Id: string;
  Role: string;
  Type?: string;
  PrimaryImageTag?: string;
}

export interface MediaStudio {
  Name: string;
  Id: string;
}

export type MediaKind = "movie" | "series" | "season" | "episode";

export interface MediaItem {
  Id: string;
  /**
   * Content type. Optional on purpose: every pre-shows code path only ever
   * fetched movies, so an absent Kind means "movie" (`itemKind()` in
   * `@/lib/media-kind` is the single normalizer). Series/season/episode paths
   * set it explicitly as they are built.
   */
  Kind?: MediaKind;
  Guid?: string;
  Name: string;
  OriginalTitle?: string;
  Language?: string;
  RunTimeTicks?: number;
  ProductionYear?: number;
  CommunityRating?: number;
  CommunityRatingSource?: string;
  Overview?: string;
  Taglines?: string[];
  OfficialRating?: string;
  Genres?: string[];
  People?: MediaPerson[];
  Studios?: MediaStudio[];
  ImageTags?: {
    Primary?: string;
    Logo?: string;
    Thumb?: string;
    Backdrop?: string;
    Banner?: string;
    Art?: string;
  };
  BackdropImageTags?: string[];
  UserData?: {
    IsFavorite: boolean;
    Likes?: boolean;
    Played?: boolean;
  };
  BlurDataURL?: string;
  ProviderIds?: Record<string, string>;
  InLibrary?: boolean;
  // Shows (2.0). Populated only by series/season/episode paths; absent on
  // movies so no existing consumer has to change.
  SeriesId?: string;
  SeriesName?: string;
  SeasonNumber?: number;
  EpisodeNumber?: number;
  SeasonCount?: number;
  EpisodeCount?: number;
  Status?: "continuing" | "ended" | "upcoming";
  EndYear?: number;
  EpisodeRuntimeMinutes?: number;
  Progress?: {
    played: boolean;
    unplayedCount?: number;
    positionTicks?: number;
  };
  WatchProviders?: WatchProvider[];
  likedBy?: {
    userId: string;
    userName: string;
    sessionCode?: string | null;
    hasCustomProfilePicture?: boolean;
    profileUpdatedAt?: string;
  }[];
}

export interface MediaLibrary {
  Id: string;
  Name: string;
  CollectionType?: string;
}

export interface MediaGenre {
  Id: string;
  Name: string;
}

export interface MediaYear {
  Name: string;
  Value: number;
}

export interface MediaRating {
  Name: string;
  Value: string;
}

export interface WatchProvider {
  Id: string;
  Name: string;
  LogoPath: string;
}

export interface MediaRegion {
  Id: string;
  Name: string;
}
