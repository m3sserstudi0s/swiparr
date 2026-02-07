import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating,
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
  },
  [ProviderType.PLEX]: {
    hasAuth: true,
    hasQuickConnect: false,
    hasWatchlist: true,
    hasLibraries: true,
    hasSettings: true,
    requiresServerUrl: true,
    isExperimental: true,
    hasStreamingSettings: false,
    isAdminPanel: true,
  },
  [ProviderType.TMDB]: {
    hasAuth: false,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: false,
    requiresServerUrl: false,
    isExperimental: false,
    hasStreamingSettings: true,
    isAdminPanel: false,
  },
};


export interface SearchFilters {
  genres?: string[];
  years?: number[];
  ratings?: string[];
  minCommunityRating?: number;
  libraries?: string[];
  watchProviders?: string[];
  watchRegion?: string;
  searchTerm?: string;
  sortBy?: string;
  unplayedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface MediaProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  // Items
  getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]>;
  getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem>;
  
  // Metadata
  getGenres(auth?: AuthContext): Promise<MediaGenre[]>;
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
