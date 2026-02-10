export interface MediaPerson {
  Name: string;
  Id: string;
  Role: string;
  Type?: string;
  PrimaryImageTag?: string;
}

export interface MediaStudio {
  Name: string;
  Id: string;
}

export interface MediaItem {
  Id: string;
  Name: string;
  OriginalTitle?: string;
  RunTimeTicks?: number;
  ProductionYear?: number;
  CommunityRating?: number;
  Overview?: string;
  Taglines?: string[];
  OfficialRating?: string;
  Genres?: string[];
  People?: MediaPerson[];
  Studios?: MediaStudio[];
  ImageTags?: {
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
  BlurDataURL?: string;
  WatchProviders?: WatchProvider[];
  likedBy?: {
    userId: string;
    userName: string;
    sessionCode?: string | null;
    hasCustomProfilePicture?: boolean;
    profileUpdatedAt?: string;
  }[];
}

export interface MediaLibrary {
  Id: string;
  Name: string;
  CollectionType?: string;
}

export interface MediaGenre {
  Id: string;
  Name: string;
}

export interface MediaYear {
  Name: string;
  Value: number;
}

export interface MediaRating {
  Name: string;
  Value: string;
}

export interface WatchProvider {
  Id: string;
  Name: string;
  LogoPath: string;
}

export interface MediaRegion {
  Id: string;
  Name: string;
}
