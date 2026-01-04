export interface Filters {
  genres: string[];
  yearRange?: [number, number];
  minCommunityRating?: number;
  officialRatings?: string[];
}

// Unified item interface that works with both Jellyfin and Plex
// Using Jellyfin-style naming for backwards compatibility
export interface JellyfinItem {
  Name: string;
  OriginalTitle?: string;
  Id: string;
  RunTimeTicks?: number; // 1 tick = 100ns (Jellyfin) or milliseconds (Plex - converted)
  ProductionYear?: number;
  CommunityRating?: number;
  Overview?: string;
  Taglines?: string[];
  OfficialRating?: string; // e.g., PG-13
  Genres?: string[];
  People?: {
    Name: string;
    Id: string;
    Role: string;
    Type?: string;
    PrimaryImageTag?: string;
  }[];
  Studios?: {
    Name: string;
    Id: string;
  }[];
  ImageTags: {
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
  };
  likedBy?: {
    userId: string;
    userName: string;
  }[];
}

// Plex-specific raw item from Plex API
export interface PlexMetadata {
  ratingKey: string;
  key: string;
  guid: string;
  type: string;
  title: string;
  originalTitle?: string;
  summary?: string;
  year?: number;
  tagline?: string;
  duration?: number; // milliseconds
  audienceRating?: number;
  rating?: number;
  contentRating?: string; // e.g., "PG-13"
  thumb?: string;
  art?: string;
  banner?: string;
  Genre?: { tag: string }[];
  Director?: { tag: string }[];
  Role?: { tag: string; role?: string }[];
  Writer?: { tag: string }[];
  Country?: { tag: string }[];
  Studio?: { tag: string }[];
  viewCount?: number;
  lastViewedAt?: number;
}

// Convert Plex metadata to unified JellyfinItem format
export function plexToUnifiedItem(plex: PlexMetadata): JellyfinItem {
  return {
    Name: plex.title,
    OriginalTitle: plex.originalTitle,
    Id: plex.ratingKey,
    // Convert Plex milliseconds to Jellyfin ticks (1 tick = 100ns = 0.0001ms)
    RunTimeTicks: plex.duration ? plex.duration * 10000 : undefined,
    ProductionYear: plex.year,
    CommunityRating: plex.audienceRating || plex.rating,
    Overview: plex.summary,
    Taglines: plex.tagline ? [plex.tagline] : undefined,
    OfficialRating: plex.contentRating,
    Genres: plex.Genre?.map(g => g.tag) || [],
    People: plex.Role?.map(r => ({
      Name: r.tag,
      Id: r.tag, // Plex doesn't give unique IDs for people in this context
      Role: r.role || '',
      Type: 'Actor',
    })) || [],
    Studios: plex.Studio?.map(s => ({
      Name: s.tag,
      Id: s.tag,
    })) || [],
    ImageTags: {
      Primary: plex.thumb ? 'plex' : undefined,
      Art: plex.art ? 'plex' : undefined,
      Banner: plex.banner ? 'plex' : undefined,
    },
    BackdropImageTags: plex.art ? ['plex'] : [],
    UserData: {
      IsFavorite: false, // Would need separate API call to check
      Likes: undefined,
    },
  };
}

export interface SessionData {
  user: {
    Id: string;
    Name: string;
    AccessToken: string;
    DeviceId: string;
    isAdmin?: boolean;
    wasMadeAdmin?: boolean;
    isGuest?: boolean;
    // Plex-specific fields
    plexEmail?: string;
    plexThumb?: string;
  };
  sessionCode?: string;
  isLoggedIn: boolean;
  soloFilters?: Filters;
  tempDeviceId?: string;
}

export interface SwipePayload {
  itemId: string;
  direction: "left" | "right";
  item?: JellyfinItem;
}

export interface MergedLike extends JellyfinItem {
  swipedAt?: string;
  sessionCode?: string | null;
  isMatch?: boolean;
  likedBy?: {
    userId: string;
    userName: string;
  }[];
}

export interface SessionSettings {
  matchStrategy: "atLeastTwo" | "allMembers";
  maxLeftSwipes?: number;
  maxRightSwipes?: number;
  maxMatches?: number;
}

export interface SessionStats {
  mySwipes: { left: number; right: number };
  myLikeRate: number;
  avgSwipes: { left: number; right: number };
  avgLikeRate: number;
  totalSwipes: { left: number; right: number };
}

// Plex library section
export interface PlexLibrarySection {
  key: string;
  title: string;
  type: string;
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
}
