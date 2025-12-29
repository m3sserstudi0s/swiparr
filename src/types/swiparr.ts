export interface JellyfinItem {
  Name: string;
  Id: string;
  RunTimeTicks?: number; // 1 tick = 100ns
  ProductionYear?: number;
  CommunityRating?: number;
  Overview?: string;
  OfficialRating?: string; // e.g., PG-13
  Genres?: string[];
  People?: {
    Name: string;
    Id: string;
    Role: string;
    PrimaryImageTag?: string;
  }[];
  ImageTags: {
    Primary?: string;
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
  };
  sessionCode?: string; // <--- ADD THIS
  isLoggedIn: boolean;
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

