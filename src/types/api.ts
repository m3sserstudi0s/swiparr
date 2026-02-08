import { MediaItem } from "./media";
import { Filters, SessionSettings } from "./session";

import { ProviderCapabilities } from "@/lib/providers/types";

export interface SwipePayload {
  itemId: string;
  direction: "left" | "right";
  item?: MediaItem;
  sessionCode?: string | null;
}

export interface SwipeResponse {
  success: boolean;
  isMatch: boolean;
  matchBlockedByLimit?: boolean;
  likedBy?: {
    userId: string;
    userName: string;
    sessionCode?: string | null;
  }[];
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
  provider: string;
  capabilities: ProviderCapabilities;
  serverUrl?: string;
  settingsHash?: string;
  hasCustomProfilePicture?: boolean;
}


export interface MergedLike extends MediaItem {
  swipedAt?: string;
  sessionCode?: string | null;
  isMatch?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    Id: string;
    Name: string;
  };
}
