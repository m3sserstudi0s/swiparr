import { JellyfinItem } from "./jellyfin";
import { Filters, SessionSettings } from "./session";

export interface SwipePayload {
  itemId: string;
  direction: "left" | "right";
  item?: JellyfinItem;
  sessionCode?: string | null;
}

export interface SwipeResponse {
  success: boolean;
  isMatch: boolean;
  matchBlockedByLimit?: boolean;
}

export interface SessionStatus {
  code: string | null;
  userId: string;
  userName: string;
  effectiveUserId: string;
  isGuest: boolean;
  isAdmin: boolean;
  hostUserId: string | null;
  filters: Filters | null;
  settings: SessionSettings | null;
}

export interface MergedLike extends JellyfinItem {
  swipedAt?: string;
  sessionCode?: string | null;
  isMatch?: boolean;
  likedBy?: {
    userId: string;
    userName: string;
    sessionCode?: string | null;
  }[];
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    Id: string;
    Name: string;
  };
}
