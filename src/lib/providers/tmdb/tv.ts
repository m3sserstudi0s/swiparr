import type { MediaItem } from "@/types/media";
import { TMDB_TV_ID_PREFIX } from "@/lib/constants";
import { stripTypedPrefix } from "@/lib/providers/item-source";

/**
 * TMDB keeps movies and series in separate id spaces, so id 1399 can be a film and
 * a show at once. Series are therefore stored with the typed prefix, which is also
 * what the swipe tables use to tell a stored like's kind apart.
 */
export function tmdbTvId(tmdbId: number | string): string {
  return `${TMDB_TV_ID_PREFIX}${tmdbId}`;
}

/** Accepts a typed or bare id and returns the number TMDB's API expects. */
export function tvApiId(id: string | number): string {
  return stripTypedPrefix(String(id));
}

/**
 * Season numbers a show actually has, in order, specials excluded.
 *
 * The show payload lists every season but TMDB has no "all episodes" endpoint:
 * `tv/{id}/season/{n}` answers for exactly one season. So the provider fans out
 * over these numbers instead of assuming season 1 (which is what it used to do,
 * leaving every other season row empty).
 */
export function seasonNumbersFor(show: { seasons?: Array<{ season_number?: number | null }> }): number[] {
  const numbers = (show.seasons ?? [])
    .map((season) => season?.season_number)
    .filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0);
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

/** TMDB's free-text status -> the three states the deck understands. */
export function tvStatusOf(status?: string): MediaItem["Status"] {
  const value = (status ?? "").toLowerCase();
  if (value.includes("returning") || value.includes("in production") || value.includes("planned")) {
    return "continuing";
  }
  if (value.includes("ended") || value.includes("canceled") || value.includes("cancelled")) {
    return "ended";
  }
  if (value.includes("upcoming") || value.includes("pilot")) {
    return "upcoming";
  }
  return undefined;
}

function yearOf(date?: string): number | undefined {
  if (!date) return undefined;
  const year = new Date(date).getFullYear();
  return Number.isFinite(year) ? year : undefined;
}

/**
 * List payload (`discover/tv`, `search/tv`, `trending/tv`) -> MediaItem.
 *
 * TMDB has no progress data at all: no episode watched counts, no position. Those
 * fields stay undefined, and the deck relies on `hasProgress: false` to hide
 * Continue rather than showing a fake bar.
 */
export function mapTvListItem(tv: any, genreMap?: Map<string, string>): MediaItem {
  return {
    Id: tmdbTvId(tv.id),
    Kind: "series",
    Name: tv.name,
    OriginalTitle: tv.original_name,
    Overview: tv.overview,
    Language: tv.original_language,
    ProductionYear: yearOf(tv.first_air_date),
    CommunityRating: tv.vote_average,
    ImageTags: {
      Primary: tv.poster_path,
      Backdrop: tv.backdrop_path,
    },
    BackdropImageTags: tv.backdrop_path ? [tv.backdrop_path] : [],
    Genres: tv.genre_ids?.map((id: number) => genreMap?.get(id.toString())).filter(Boolean) || [],
    Status: tvStatusOf(tv.status),
    SeasonCount: typeof tv.number_of_seasons === "number" ? tv.number_of_seasons : undefined,
    EpisodeCount: typeof tv.number_of_episodes === "number" ? tv.number_of_episodes : undefined,
    EpisodeRuntimeMinutes: Array.isArray(tv.episode_run_time) && tv.episode_run_time[0]
      ? tv.episode_run_time[0]
      : undefined,
    EndYear: yearOf(tv.last_air_date),
  };
}

/**
 * `tv/{id}` -> MediaItem. Detail payloads carry genres as objects rather than ids,
 * so the genre map is not needed; people and watch providers are attached by the
 * caller, which owns those mappers.
 */
export function mapTvDetails(tv: any): MediaItem {
  const people = [
    ...(tv.credits?.cast?.slice(0, 10).map((p: any) => ({
      Id: p.id.toString(),
      Name: p.name,
      Role: p.character,
      Type: "Actor" as const,
      PrimaryImageTag: p.profile_path,
    })) || []),
    ...(tv.credits?.crew?.filter((p: any) => p.job === "Director" || p.job === "Creator").map((p: any) => ({
      Id: p.id.toString(),
      Name: p.name,
      Role: p.job,
      Type: "Director" as const,
      PrimaryImageTag: p.profile_path,
    })) || []),
  ];

  return {
    Id: tmdbTvId(tv.id),
    Kind: "series",
    Name: tv.name,
    OriginalTitle: tv.original_name,
    Overview: tv.overview,
    Language: tv.original_language,
    ProductionYear: yearOf(tv.first_air_date),
    CommunityRating: tv.vote_average,
    Taglines: tv.tagline ? [tv.tagline] : [],
    Genres: tv.genres?.map((g: any) => g.name),
    ImageTags: {
      Primary: tv.poster_path,
      Backdrop: tv.backdrop_path,
    },
    BackdropImageTags: tv.backdrop_path ? [tv.backdrop_path] : [],
    People: people,
    Status: tvStatusOf(tv.status),
    SeasonCount: typeof tv.number_of_seasons === "number" ? tv.number_of_seasons : undefined,
    EpisodeCount: typeof tv.number_of_episodes === "number" ? tv.number_of_episodes : undefined,
    EpisodeRuntimeMinutes: Array.isArray(tv.episode_run_time) && tv.episode_run_time[0]
      ? tv.episode_run_time[0]
      : undefined,
    EndYear: yearOf(tv.last_air_date),
  };
}

/** One entry of `tv/{id}`'s `seasons` array -> a season MediaItem. */
export function mapTvSeason(season: any, show?: { id: number | string; name?: string }): MediaItem {
  return {
    Id: `${tmdbTvId(show?.id ?? "")}:s${season.season_number}`,
    Kind: "season",
    Name: season.name || `Season ${season.season_number}`,
    Overview: season.overview,
    SeriesId: show ? tmdbTvId(show.id) : tmdbTvId(season.show_id ?? ""),
    SeriesName: show?.name,
    SeasonNumber: season.season_number,
    EpisodeCount: typeof season.episode_count === "number" ? season.episode_count : undefined,
    ProductionYear: yearOf(season.air_date),
    ImageTags: { Primary: season.poster_path },
  };
}

/** `tv/{id}/season/{n}` episode -> an episode MediaItem. */
export function mapTvEpisode(
  episode: any,
  show: { id: number | string; name?: string },
  seasonNumber: number
): MediaItem {
  return {
    Id: `${tmdbTvId(show.id)}:s${seasonNumber}e${episode.episode_number}`,
    Kind: "episode",
    Name: episode.name,
    Overview: episode.overview,
    SeriesId: tmdbTvId(show.id),
    SeriesName: show.name,
    SeasonNumber: seasonNumber,
    EpisodeNumber: episode.episode_number,
    RunTimeTicks: episode.runtime ? episode.runtime * 60 * 10_000_000 : undefined,
    CommunityRating: episode.vote_average,
    ImageTags: { Primary: episode.still_path },
  };
}
