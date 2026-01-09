export interface JellyfinPerson {
  Name: string;
  Id: string;
  Role: string;
  Type?: string;
  PrimaryImageTag?: string;
}

export interface JellyfinStudio {
  Name: string;
  Id: string;
}

export interface ImageTags {
  Primary?: string;
  Logo?: string;
  Thumb?: string;
  Backdrop?: string;
  Banner?: string;
  Art?: string;
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
  OfficialRating?: string;
  Genres?: string[];
  People?: JellyfinPerson[];
  Studios?: JellyfinStudio[];
  ImageTags: ImageTags;
  BackdropImageTags?: string[];
  UserData?: {
    IsFavorite: boolean;
    Likes?: boolean;
  };
  BlurDataURL?: string;
  likedBy?: {
    userId: string;
    userName: string;
    sessionCode?: string | null;
  }[];
}
