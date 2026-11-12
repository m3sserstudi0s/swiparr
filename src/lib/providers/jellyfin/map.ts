import type { MediaItem, MediaKind } from "@/types/media";
import { kindFromJellyfinType } from "./params";

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

function normalizeStatus(status?: string): MediaItem["Status"] | undefined {
  const value = (status ?? "").toLowerCase();
  if (value === "continuing") return "continuing";
  if (value === "ended") return "ended";
  if (value === "upcoming") return "upcoming";
  return undefined;
}

function yearOf(iso?: string): number | undefined {
  if (!iso) return undefined;
  const year = new Date(iso).getFullYear();
  return Number.isFinite(year) ? year : undefined;
}

function ticksToMinutes(ticks?: number): number | undefined {
  if (typeof ticks !== "number" || ticks <= 0) return undefined;
  return Math.round(ticks / 600_000_000);
}

/**
 * Pure mapping from a Jellyfin item payload to a MediaItem.
 * Kept free of provider imports so it can be tested without HTTP or Next runtime.
 *
 * Series/season/episode fields are attached only for those kinds: a movie comes
 * out exactly as it did before 2.0 (plus `Kind`), so nothing downstream has to
 * learn to ignore empty series fields.
 */
export function mapJellyfinItem(item: any): MediaItem {
  const kind: MediaKind = kindFromJellyfinType(item.Type) ?? "movie";

  const mapped: MediaItem = {
    Id: item.Id,
    Kind: kind,
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

  // Progress is a shows concept: only surfaced when Jellyfin reports a count.
  if (typeof item.UserData?.UnplayedItemCount === "number") {
    mapped.Progress = {
      played: !!item.UserData.Played,
      unplayedCount: item.UserData.UnplayedItemCount,
      positionTicks: item.UserData.PlaybackPositionTicks,
    };
  }

  if (kind === "series") {
    mapped.SeasonCount = item.ChildCount;
    mapped.EpisodeCount = item.RecursiveItemCount;
    mapped.Status = normalizeStatus(item.Status);
    mapped.EndYear = yearOf(item.EndDate);
  }

  if (kind === "season") {
    mapped.SeriesId = item.SeriesId;
    mapped.SeriesName = item.SeriesName;
    mapped.SeasonNumber = item.IndexNumber;
    mapped.EpisodeCount = item.ChildCount;
  }

  if (kind === "episode") {
    mapped.SeriesId = item.SeriesId;
    mapped.SeriesName = item.SeriesName;
    mapped.SeasonNumber = item.ParentIndexNumber;
    mapped.EpisodeNumber = item.IndexNumber;
    mapped.EpisodeRuntimeMinutes = ticksToMinutes(item.RunTimeTicks);
  }

  return mapped;
}
