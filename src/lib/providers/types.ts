import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating 
} from "@/types/media";

export interface ProviderCapabilities {
  hasAuth: boolean;
  hasQuickConnect: boolean;
  hasWatchlist: boolean;
  hasLibraries: boolean;
  hasSettings: boolean;
  requiresServerUrl: boolean;
}

export interface SearchFilters {
  genres?: string[];
  years?: number[];
  ratings?: string[];
  libraries?: string[];
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

  // Images
  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string): string;
  getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string>;

  // Auth (optional, based on capabilities)
  authenticate?(username: string, password?: string, deviceId?: string): Promise<any>;

  // User Actions (optional)
  toggleWatchlist?(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void>;
  toggleFavorite?(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void>;

  // Quick Connect (optional)
  initiateQuickConnect?(deviceId: string): Promise<any>;
  checkQuickConnect?(secret: string, deviceId: string): Promise<any>;
}

export interface AuthContext {
  accessToken?: string;
  deviceId?: string;
  userId?: string;
}
