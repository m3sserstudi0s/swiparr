export interface Filters {
  genres: string[];
  yearRange?: [number, number];
  minCommunityRating?: number;
  officialRatings?: string[];
  runtimeRange?: [number, number];
  watchProviders?: string[];
  watchRegion?: string;
  sortBy?: string;
  themes?: string[];
  languages?: string[];
  unplayedOnly?: boolean;
  mediaType?: "movie" | "tv" | "both";
}

export interface SessionSettings {
  matchStrategy?: "atLeastTwo" | "allMembers";
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

export interface SessionMember {
  externalUserId: string;
  externalUserName: string;
  isAdmin?: boolean;
  hasCustomProfilePicture?: boolean;
  profileUpdatedAt?: string;
}

