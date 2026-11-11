import type { MediaKind } from "@/types/media";

/**
 * Which deck a session is showing (2.0). One active mode per session; `mixed`
 * is opt-in and chips each card with its kind.
 */
export type DeckMode = "movies" | "shows" | "continue" | "episodes" | "mixed";

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
  /** Absent on every filter object written before 2.0 — read it via `deckModeOf`. */
  deckMode?: DeckMode;
  /** Derived from `deckMode`, stored so cache keys and API params carry it. */
  kinds?: MediaKind[];
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
