import { MediaItem, MediaPerson, MediaStudio } from "./media";

export type JellyfinItem = MediaItem;
export type JellyfinPerson = MediaPerson;
export type JellyfinStudio = MediaStudio;

export interface ImageTags {
  Primary?: string;
  Logo?: string;
  Thumb?: string;
  Backdrop?: string;
  Banner?: string;
  Art?: string;
}
