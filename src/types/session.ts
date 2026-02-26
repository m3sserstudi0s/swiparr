export interface Filters {
  genres: string[];
  excludedGenres?: string[];
  yearRange?: [number, number];
  minCommunityRating?: number;
  officialRatings?: string[];
  excludedOfficialRatings?: string[];
  runtimeRange?: [number, number];
  watchProviders?: string[];
  watchRegion?: string;
  sortBy?: string;
  themes?: string[];
  excludedThemes?: string[];
  tmdbLanguages?: string[];
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
