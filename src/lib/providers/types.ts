import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating,
  MediaKind,
  WatchProvider,
  MediaRegion
} from "@/types/media";

export enum ProviderType {
  JELLYFIN = 'jellyfin',
  TMDB = 'tmdb',
  PLEX = 'plex',
  EMBY = 'emby'
}

export interface ProviderCapabilities {
  hasAuth: boolean;
  hasQuickConnect: boolean;
  hasWatchlist: boolean;
  hasLibraries: boolean;
  hasSettings: boolean;
  requiresServerUrl: boolean;
  isExperimental: boolean;
  hasStreamingSettings: boolean; // TMDB specific streaming/region filters
  isAdminPanel: boolean; // Jellyfin/Emby/Plex server management
  // Shows (2.0). Declared true only once the provider actually implements it —
  // these flags gate the deck modes, so a premature true shows an empty deck.
  hasSeries: boolean;
  hasSeasons: boolean;
  hasProgress: boolean;
  hasNextUp: boolean;
}

export const PROVIDER_CAPABILITIES: Record<ProviderType, ProviderCapabilities> = {
  [ProviderType.JELLYFIN]: {
    hasAuth: true,
    hasQuickConnect: true,
    hasWatchlist: true,
    hasLibraries: true,
    hasSettings: true,
    requiresServerUrl: true,
    isExperimental: false,
    hasStreamingSettings: false,
    isAdminPanel: true,
    hasSeries: true,
    hasSeasons: true,
    hasProgress: true,
    hasNextUp: true,
  },
  [ProviderType.EMBY]: {
    hasAuth: true,
    hasQuickConnect: false,
    hasWatchlist: true,
    hasLibraries: true,
    hasSettings: true,
    requiresServerUrl: true,
    isExperimental: true,
    hasStreamingSettings: false,
    isAdminPanel: true,
    // Same API surface as Jellyfin, sharing its mapper and request shaping.
    hasSeries: true,
    hasSeasons: true,
    hasProgress: true,
    hasNextUp: true,
  },
  [ProviderType.PLEX]: {
    hasAuth: true,
    hasQuickConnect: true,
    hasWatchlist: true,
    hasLibraries: true,
    hasSettings: true,
    requiresServerUrl: true,
    isExperimental: false,
    hasStreamingSettings: false,
    isAdminPanel: true,
    // type=2/3/4, /children and /library/onDeck are implemented.
    hasSeries: true,
    hasSeasons: true,
    hasProgress: true,
    hasNextUp: false,
  },
  [ProviderType.TMDB]: {
    hasAuth: false,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: true,
    requiresServerUrl: false,
    isExperimental: false,
    hasStreamingSettings: true,
    isAdminPanel: false,
    // discover/tv, tv/{id} and season detail are implemented; TMDB has no
    // progress data at all, so Continue and next-up stay off.
    hasSeries: true,
    hasSeasons: true,
    hasProgress: false,
    hasNextUp: false,
  },
};


export interface SearchFilters {
  /** Content kinds to fetch. Absent means movies (the pre-2.0 behaviour). */
  kinds?: MediaKind[];
  /** Series airing state, when the provider supports it. */
  status?: ("continuing" | "ended")[];
  /** Series watch state for the Continue/Start decks. */
  started?: "any" | "notStarted" | "inProgress";
  genres?: string[];
  excludedGenres?: string[];
  years?: number[];
  ratings?: string[];
  excludedRatings?: string[];
  minCommunityRating?: number;
  runtimeRange?: [number, number];
  libraries?: string[];
  watchProviders?: string[];
  watchRegion?: string;
  searchTerm?: string;
  sortBy?: string;
  unplayedOnly?: boolean;
  themes?: string[];
  excludedThemes?: string[];
  tmdbLanguages?: string[];
  watchMonetizationTypes?: string;
  limit?: number;
  offset?: number;
}

export interface MediaProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  // Items
  getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]>;
  getItemDetails(id: string, auth?: AuthContext, options?: { includeUserState?: boolean }): Promise<MediaItem>;

  // Shows (2.0). Optional: a provider declares support through its capability flags.
  /** Seasons or episodes of a series, in air order. */
  getChildren?(seriesId: string, kind: "season" | "episode", auth?: AuthContext, options?: { season?: number }): Promise<MediaItem[]>;
  /** The next unwatched episode per series (Jellyfin/Emby NextUp, Plex onDeck). */
  getNextUp?(auth?: AuthContext, limit?: number): Promise<MediaItem[]>;
  
  // Metadata
  getGenres(auth?: AuthContext): Promise<MediaGenre[]>;
  getThemes?(auth?: AuthContext): Promise<string[]>;
  getYears(auth?: AuthContext): Promise<MediaYear[]>;
  getRatings(auth?: AuthContext): Promise<MediaRating[]>;
  getLibraries(auth?: AuthContext): Promise<MediaLibrary[]>;
  getWatchProviders?(region: string, auth?: AuthContext): Promise<WatchProvider[]>;
  getRegions?(auth?: AuthContext): Promise<MediaRegion[]>;

  // Images
  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string, auth?: AuthContext): string;
  getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string>;
  fetchImage(itemId: string, type: string, tag?: string, auth?: AuthContext, options?: Record<string, string>): Promise<ImageResponse>;

  // Auth (optional, based on capabilities)
  authenticate?(username: string, password?: string, deviceId?: string, serverUrl?: string): Promise<any>;
  initiateQuickConnect?(deviceId: string, serverUrl?: string): Promise<any>;
  checkQuickConnect?(secret: string, deviceId: string, serverUrl?: string): Promise<any>;

  // Actions
  toggleWatchlist?(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void>;
  toggleFavorite?(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void>;
}

export interface AuthContext {
  accessToken?: string;
  deviceId?: string;
  userId?: string;
  serverUrl?: string;
  tmdbToken?: string;
  watchRegion?: string;
}

export interface ImageResponse {
  data: Buffer | ArrayBuffer;
  contentType: string;
}


export interface AuthContext {
  accessToken?: string;
  deviceId?: string;
  userId?: string;
  serverUrl?: string;
  tmdbToken?: string;
  watchRegion?: string;
}
