export interface Filters {
  genres: string[];
  yearRange?: [number, number];
  minCommunityRating?: number;
}

export interface JellyfinItem {
  Name: string;
  OriginalTitle?: string;
  Id: string;
  RunTimeTicks?: number; // 1 tick = 100ns
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


export interface SessionData {
  user: {
    Id: string;
    Name: string;
    AccessToken: string;
    DeviceId: string;
    isAdmin?: boolean;
    wasMadeAdmin?: boolean;
    isGuest?: boolean;
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

