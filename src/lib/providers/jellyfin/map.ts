import type { MediaItem } from "@/types/media";

function getItemLanguage(item: any): string | undefined {
  const preferred = item.PreferredMetadataLanguage?.trim();
  if (preferred) {
    return preferred;
  }

  const streams = Array.isArray(item.MediaStreams) ? item.MediaStreams : [];
  const audioStreams = streams.filter((stream: { Type: any }) => {
    const type = typeof stream?.Type === "string" ? stream.Type : "";
    return type.toLowerCase() === "audio";
  });

  const defaultAudio = audioStreams.find((stream: { IsDefault: any; Language: any }) => stream?.IsDefault && stream?.Language);
  if (defaultAudio?.Language) {
    return defaultAudio.Language;
  }

  return audioStreams.find((stream: { Language: any }) => stream?.Language)?.Language;
}

/**
 * Pure mapping from a Jellyfin item payload to a MediaItem.
 * Kept free of provider imports so it can be tested without HTTP or Next runtime.
 */
export function mapJellyfinItem(item: any): MediaItem {
  return {
    Id: item.Id,
    Name: item.Name,
    OriginalTitle: item.OriginalTitle,
    Language: getItemLanguage(item),
    RunTimeTicks: item.RunTimeTicks,
    ProductionYear: item.ProductionYear,
    CommunityRating: item.CommunityRating,
    Overview: item.Overview,
    Taglines: item.Taglines,
    OfficialRating: item.OfficialRating,
    Genres: item.Genres,
    People: item.People?.map((p: any) => ({
      Name: p.Name,
      Id: p.Id,
      Role: p.Role,
      Type: p.Type,
      PrimaryImageTag: p.PrimaryImageTag,
    })),
    ImageTags: item.ImageTags,
    BackdropImageTags: item.BackdropImageTags,
    ProviderIds: item.ProviderIds,
    UserData: item.UserData ? {
      IsFavorite: item.UserData.IsFavorite,
      Likes: item.UserData.Likes,
      Played: item.UserData.Played,
    } : undefined,
  };
}
