import { v4 as uuidv4 } from "uuid";
import { config as appConfig } from "@/lib/config";
import {
  MediaProvider,
  ProviderCapabilities,
  SearchFilters,
  AuthContext,
  ImageResponse,
  ProviderType,
  PROVIDER_CAPABILITIES
} from "../types";
import axios from "axios";
import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating,
  WatchProvider,
  MediaRegion
} from "@/types/media";
import { TmdbSearchResponseSchema, TmdbMovieSchema } from "../schemas";
import { logger } from "@/lib/logger";
import { DEFAULT_THEMES } from "@/lib/constants";
import { kindFromId } from "@/lib/providers/item-source";
import { mapTvDetails, mapTvEpisode, mapTvListItem, mapTvSeason, tvApiId, tvStatusOf } from "./tv";
import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * TMDB Provider
 * Uses pure REST API calls.
 * Official Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */
export class TmdbProvider implements MediaProvider {
  readonly name = ProviderType.TMDB;
  private apiKey: string;
  
  readonly capabilities: ProviderCapabilities = PROVIDER_CAPABILITIES[ProviderType.TMDB];

  /** id -> counts/status, so one deck page does not re-fetch what it just learned. */
  private tvCountsCache = new Map<string, { at: number; seasons?: number; episodes?: number; status?: MediaItem["Status"] }>();

  constructor(token?: string) {
    this.apiKey = token || appConfig.TMDB_ACCESS_TOKEN || '';
  }

  private async fetchTmdb<T>(path: string, params: Record<string, any> = {}): Promise<T> {
    const res = await axios.get(`https://api.themoviedb.org/3/${path.replace(/^\//, '')}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
      params
    });
    return res.data;
  }

  /**
   * Dispatches by content kind. TMDB keeps films and series in separate endpoints
   * and separate id spaces, so a deck of one kind never touches the other's code,
   * and a mixed deck asks both and interleaves.
   */
  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }

    const kinds = filters.kinds && filters.kinds.length > 0 ? filters.kinds : ["movie" as const];
    const wantsSeries = kinds.some((kind) => kind !== "movie");
    const wantsMovies = kinds.includes("movie");

    if (wantsSeries && !wantsMovies) {
      return this.getSeriesItems(filters, auth);
    }
    if (!wantsSeries) {
      return this.getMovieItems(filters, auth);
    }

    // Mixed deck: both kinds, limited per side so one cannot starve the other.
    const half = Math.max(Math.ceil((filters.limit || 20) / 2), 8);
    const [movies, series] = await Promise.all([
      this.getMovieItems({ ...filters, limit: half }, auth),
      this.getSeriesItems({ ...filters, limit: half }, auth),
    ]);
    const merged: MediaItem[] = [];
    for (let i = 0; i < Math.max(movies.length, series.length); i++) {
      if (movies[i]) merged.push(movies[i]);
      if (series[i]) merged.push(series[i]);
    }
    return merged.slice(0, filters.limit || 20);
  }

  private async getMovieItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    const genres = await this.getGenres(auth);
    const genreIdMap = new Map(genres.map(g => [g.Name, g.Id]));
    const genreNameMap = new Map(genres.map(g => [g.Id, g.Name]));

    if (filters.searchTerm) {
        const data = await this.fetchTmdb<any>('search/movie', {
            query: filters.searchTerm,
            page: filters.offset ? Math.floor(filters.offset / 20) + 1 : 1
        });
        const searchRes = TmdbSearchResponseSchema.parse(data);
        return searchRes.results.map(m => this.mapMovieToMediaItem(m, genreNameMap));
    }

    if (filters.sortBy === "Trending" && (!filters.watchProviders || filters.watchProviders.length === 0)) {
        const data = await this.fetchTmdb<any>('trending/movie/week', {
            page: filters.offset ? Math.floor(filters.offset / 20) + 1 : 1
        });

        const searchRes = TmdbSearchResponseSchema.parse(data);
        const results = searchRes.results.map(m => this.mapMovieToMediaItem(m, genreNameMap));
        // Client-side filtering for trending as it's a separate endpoint
        return this.applyTrendingFilters(results, filters);
    }

    // Default to discover
    // Docs: https://developer.themoviedb.org/reference/discover-movie-get
    const discoverParams: Record<string, any> = {
        page: filters.offset ? Math.floor(filters.offset / 20) + 1 : 1,
        with_genres: filters.genres?.map(name => genreIdMap.get(name)).filter(Boolean).join(','),
        sort_by: filters.sortBy === "Popular" ? "popularity.desc" : 
                 filters.sortBy === "Top Rated" ? "vote_average.desc" : 
                 filters.sortBy === "Newest" ? "primary_release_date.desc" : "popularity.desc"
    };

    if (filters.excludedGenres && filters.excludedGenres.length > 0) {
        discoverParams.without_genres = filters.excludedGenres.map(name => genreIdMap.get(name)).filter(Boolean).join(',');
    }

    if (filters.themes && filters.themes.length > 0) {
        const themeKeywords = await Promise.all(filters.themes.map(async (theme) => {
            const searchData = await this.fetchTmdb<any>('search/keyword', { query: theme });
            return searchData.results?.[0]?.id;
        }));
        const keywordIds = themeKeywords.filter(Boolean);
        if (keywordIds.length > 0) {
            discoverParams.with_keywords = keywordIds.join('|');
        }
    }

    if (filters.excludedThemes && filters.excludedThemes.length > 0) {
        const themeKeywords = await Promise.all(filters.excludedThemes.map(async (theme) => {
            const searchData = await this.fetchTmdb<any>('search/keyword', { query: theme });
            return searchData.results?.[0]?.id;
        }));
        const keywordIds = themeKeywords.filter(Boolean);
        if (keywordIds.length > 0) {
            discoverParams.without_keywords = keywordIds.join('|');
        }
    }

    if (filters.watchProviders && filters.watchProviders.length > 0) {
        discoverParams.with_watch_providers = filters.watchProviders.join('|');
        discoverParams.with_watch_monetization_types = filters.watchMonetizationTypes || 'flatrate|free|ads|rent|buy';
        if (filters.watchRegion || auth?.watchRegion) {
            discoverParams.watch_region = filters.watchRegion || auth?.watchRegion;
        }
    }

    if (filters.years && filters.years.length > 0) {
        const minYear = Math.min(...filters.years);
        const maxYear = Math.max(...filters.years);
        if (minYear === maxYear) {
            discoverParams.primary_release_year = minYear;
        } else {
            discoverParams['primary_release_date.gte'] = `${minYear}-01-01`;
            discoverParams['primary_release_date.lte'] = `${maxYear}-12-31`;
        }
    }

    if (filters.minCommunityRating && filters.minCommunityRating > 0) {
        discoverParams['vote_average.gte'] = filters.minCommunityRating;
    }

    if (filters.runtimeRange) {
        const [min, max] = filters.runtimeRange;
        if (min > 0) discoverParams['with_runtime.gte'] = min;
        if (max < 240) discoverParams['with_runtime.lte'] = max;
    }

    if (filters.ratings && filters.ratings.length > 0) {
        // Map deviant region codes to TMDB certification country codes
        const regionMapping: Record<string, string> = {
            'UK': 'GB',
        };
        const { tmdbDefaultRegion } = getRuntimeConfig();
        const region = filters.watchRegion || auth?.watchRegion || tmdbDefaultRegion;
        const certCountry = regionMapping[region] || region;
        discoverParams.certification_country = certCountry;
        discoverParams.certification = filters.ratings.join('|');
        logger.debug("[TMDBProvider.getItems] Applying certification filter:", { certCountry, ratings: filters.ratings });
    }

    if (filters.tmdbLanguages && filters.tmdbLanguages.length > 0) {
        // TMDB uses ISO 639-1 codes for with_original_language
        // If only one language selected, use it directly
        // If multiple, use pipe separator for OR logic
        discoverParams.with_original_language = filters.tmdbLanguages.join('|');
        logger.debug("[TMDBProvider.getItems] Applying language filter:", { languages: filters.tmdbLanguages });
    }

    if (filters.sortBy === "Random") {
        try {
            const initialRes = await this.fetchTmdb<any>('discover/movie', { ...discoverParams, page: 1 });
            const totalPages = Math.min(initialRes.total_pages, 500);
            discoverParams.page = Math.floor(Math.random() * totalPages) + 1;
        } catch (e) {
            discoverParams.page = Math.floor(Math.random() * 20) + 1;
        }
    }

    const data = await this.fetchTmdb<any>('discover/movie', discoverParams);
    const discoverRes = TmdbSearchResponseSchema.parse(data);
    
    return discoverRes.results.map(m => {
        const item = this.mapMovieToMediaItem(m, genreNameMap);
        if (filters.ratings && filters.ratings.length === 1) {
            item.OfficialRating = filters.ratings[0];
        }
        return item;
    });
  }

  /** Series counterpart of `getMovieItems`, using TMDB's `/tv` endpoints. */
  private async getSeriesItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    const genres = await this.getTvGenres(auth);
    const genreIdMap = new Map(genres.map(g => [g.Name, g.Id]));
    const genreNameMap = new Map(genres.map(g => [g.Id, g.Name]));
    const page = filters.offset ? Math.floor(filters.offset / 20) + 1 : 1;

    if (filters.searchTerm) {
      const data = await this.fetchTmdb<any>('search/tv', { query: filters.searchTerm, page });
      const searchRes = TmdbSearchResponseSchema.parse(data);
      return this.enrichSeriesCounts(searchRes.results.map((s: any) => mapTvListItem(s, genreNameMap)), auth);
    }

    if (filters.sortBy === "Trending" && (!filters.watchProviders || filters.watchProviders.length === 0)) {
      const data = await this.fetchTmdb<any>('trending/tv/week', { page });
      const trendingRes = TmdbSearchResponseSchema.parse(data);
      const results = this.applyTrendingFilters(trendingRes.results.map((s: any) => mapTvListItem(s, genreNameMap)), filters);
      return this.enrichSeriesCounts(results, auth);
    }

    const discoverParams: Record<string, any> = {
      page,
      with_genres: filters.genres?.map(name => genreIdMap.get(name)).filter(Boolean).join(','),
      sort_by: filters.sortBy === "Popular" ? "popularity.desc" :
               filters.sortBy === "Top Rated" ? "vote_average.desc" :
               filters.sortBy === "Newest" ? "first_air_date.desc" : "popularity.desc",
    };

    if (filters.excludedGenres && filters.excludedGenres.length > 0) {
      discoverParams.without_genres = filters.excludedGenres.map(name => genreIdMap.get(name)).filter(Boolean).join(',');
    }

    if (filters.themes && filters.themes.length > 0) {
      const keywordIds = (await Promise.all(filters.themes.map(async (theme) => {
        const searchData = await this.fetchTmdb<any>('search/keyword', { query: theme });
        return searchData.results?.[0]?.id;
      }))).filter(Boolean);
      if (keywordIds.length > 0) discoverParams.with_keywords = keywordIds.join('|');
    }

    if (filters.watchProviders && filters.watchProviders.length > 0) {
      discoverParams.with_watch_providers = filters.watchProviders.join('|');
      discoverParams.with_watch_monetization_types = filters.watchMonetizationTypes || 'flatrate|free|ads|rent|buy';
      if (filters.watchRegion || auth?.watchRegion) {
        discoverParams.watch_region = filters.watchRegion || auth?.watchRegion;
      }
    }

    if (filters.years && filters.years.length > 0) {
      const minYear = Math.min(...filters.years);
      const maxYear = Math.max(...filters.years);
      if (minYear === maxYear) {
        discoverParams.first_air_date_year = minYear;
      } else {
        discoverParams['first_air_date.gte'] = `${minYear}-01-01`;
        discoverParams['first_air_date.lte'] = `${maxYear}-12-31`;
      }
    }

    if (filters.minCommunityRating && filters.minCommunityRating > 0) {
      discoverParams['vote_average.gte'] = filters.minCommunityRating;
    }

    if (filters.runtimeRange) {
      const [min, max] = filters.runtimeRange;
      if (min > 0) discoverParams['with_runtime.gte'] = min;
      if (max < 240) discoverParams['with_runtime.lte'] = max;
    }

    if (filters.ratings && filters.ratings.length > 0) {
      const { tmdbDefaultRegion } = getRuntimeConfig();
      const region = filters.watchRegion || auth?.watchRegion || tmdbDefaultRegion;
      discoverParams.certification_country = region === 'UK' ? 'GB' : region;
      discoverParams.certification = filters.ratings.join('|');
    }

    if (filters.tmdbLanguages && filters.tmdbLanguages.length > 0) {
      discoverParams.with_original_language = filters.tmdbLanguages.join('|');
    }

    if (filters.sortBy === "Random") {
      try {
        const initialRes = await this.fetchTmdb<any>('discover/tv', { ...discoverParams, page: 1 });
        const totalPages = Math.min(initialRes.total_pages, 500);
        discoverParams.page = Math.floor(Math.random() * totalPages) + 1;
      } catch {
        discoverParams.page = Math.floor(Math.random() * 20) + 1;
      }
    }

    const data = await this.fetchTmdb<any>('discover/tv', discoverParams);
    const discoverRes = TmdbSearchResponseSchema.parse(data);
    const mapped = discoverRes.results.map((s: any) => {
      const item = mapTvListItem(s, genreNameMap);
      if (filters.ratings && filters.ratings.length === 1) {
        item.OfficialRating = filters.ratings[0];
      }
      return item;
    });
    return this.enrichSeriesCounts(mapped, auth);
  }

  /**
   * Fills the season/episode counts and status that list payloads do not carry.
   *
   * TMDB has no bulk details endpoint, so this is one request per show — cached by
   * id with a TTL, capped to the page being returned, and run with a small
   * concurrency so a 20-card deck costs ~1 s instead of 20 sequential round trips.
   * A failure leaves the card as it was rather than breaking the deck.
   */
  private async enrichSeriesCounts(items: MediaItem[], auth?: AuthContext): Promise<MediaItem[]> {
    const TTL_MS = 10 * 60 * 1000;
    const now = Date.now();
    const pending = items.filter(
      (item) => item.Kind === "series" && item.SeasonCount === undefined && item.Id
    );
    if (pending.length === 0) return items;

    const concurrency = 6;
    for (let i = 0; i < pending.length; i += concurrency) {
      const batch = pending.slice(i, i + concurrency);
      await Promise.all(batch.map(async (item) => {
        const cached = this.tvCountsCache.get(item.Id);
        if (cached && now - cached.at < TTL_MS) {
          item.SeasonCount = cached.seasons;
          item.EpisodeCount = cached.episodes;
          item.Status = cached.status;
          return;
        }
        try {
          const detail = await this.fetchTmdb<any>(`tv/${tvApiId(item.Id)}`);
          const seasons = typeof detail.number_of_seasons === "number" ? detail.number_of_seasons : undefined;
          const episodes = typeof detail.number_of_episodes === "number" ? detail.number_of_episodes : undefined;
          const status = tvStatusOf(detail.status);
          item.SeasonCount = seasons;
          item.EpisodeCount = episodes;
          item.Status = status;
          this.tvCountsCache.set(item.Id, { at: now, seasons, episodes, status });
        } catch (error) {
          logger.debug("[TMDBProvider.enrichSeriesCounts] detail lookup failed", { id: item.Id });
        }
      }));
    }

    if (this.tvCountsCache.size > 1000) {
      for (const [key, value] of this.tvCountsCache) {
        if (now - value.at > TTL_MS) this.tvCountsCache.delete(key);
      }
    }

    return items;
  }

  private async getTvGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    const data = await this.fetchTmdb<{ genres: { id: number; name: string }[] }>('genre/tv/list');
    return data.genres.map(g => ({ Id: g.id.toString(), Name: g.name }));
  }

  async getItemDetails(id: string, auth?: AuthContext, _options?: { includeUserState?: boolean }): Promise<MediaItem> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }
    // Accepts both the typed id (`tmdb:tv:1396`, movie ids may be bare) and a bare one.
    if (kindFromId(id) === "series") {
      const tv = await this.fetchTmdb<any>(`tv/${tvApiId(id)}`, {
        append_to_response: 'credits,images,watch/providers,content_ratings',
      });
      const mapped = mapTvDetails(tv);
      mapped.WatchProviders = this.mapWatchProviders(tv['watch/providers']?.results, auth?.watchRegion);
      const ratings = tv.content_ratings?.results as Array<{ iso_3166_1: string; rating: string }> | undefined;
      const { tmdbDefaultRegion } = getRuntimeConfig();
      const region = auth?.watchRegion || tmdbDefaultRegion;
      const contentRating = ratings?.find((r) => r.iso_3166_1 === region) ?? ratings?.[0];
      if (contentRating?.rating) mapped.OfficialRating = contentRating.rating;
      return mapped;
    }

    const movie = await this.fetchTmdb<any>(`movie/${tvApiId(id)}`, {
        append_to_response: 'credits,images,watch/providers,release_dates'
    });
    return this.mapMovieDetailsToMediaItem(movie, auth?.watchRegion);
  }

  /**
   * Seasons come from the show payload's `seasons` array; episodes come from
   * `tv/{id}/season/{n}`. TMDB has no watched state, so nothing here carries
   * progress — `hasProgress: false` keeps Continue out of a TMDB deck.
   */
  async getChildren(
    seriesId: string,
    kind: "season" | "episode",
    auth?: AuthContext,
    options?: { season?: number }
  ): Promise<MediaItem[]> {
    if (auth?.tmdbToken) {
      this.apiKey = auth.tmdbToken;
    }
    const id = tvApiId(seriesId);
    const show = await this.fetchTmdb<any>(`tv/${id}`);

    if (kind === "season") {
      const seasons: any[] = show.seasons || [];
      return seasons
        .filter((s) => s.season_number > 0)
        .map((s) => mapTvSeason(s, { id: show.id, name: show.name }));
    }

    const seasonNumber = options?.season ?? 1;
    const seasonData = await this.fetchTmdb<any>(`tv/${id}/season/${seasonNumber}`);
    return (seasonData.episodes || []).map((episode: any) =>
      mapTvEpisode(episode, { id: show.id, name: show.name }, seasonNumber)
    );
  }

  /** TMDB knows nothing about what has been watched, so there is no next-up. */
  async getNextUp(_auth?: AuthContext, _limit = 24): Promise<MediaItem[]> {
    return [];
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }
    // One merged list: the drawer filters both deck kinds with the same controls,
    // and TMDB gives movies and series overlapping but not identical genre ids.
    const [movies, series] = await Promise.all([
      this.fetchTmdb<{ genres: { id: number; name: string }[] }>('genre/movie/list'),
      this.getTvGenres(auth).catch(() => [] as MediaGenre[]),
    ]);
    const merged = new Map<string, MediaGenre>();
    for (const g of movies.genres) merged.set(g.name.toLowerCase(), { Id: g.id.toString(), Name: g.name });
    for (const g of series) {
      if (!merged.has(g.Name.toLowerCase())) merged.set(g.Name.toLowerCase(), g);
    }
    return Array.from(merged.values());
  }

  async getThemes(auth?: AuthContext): Promise<string[]> {
    return DEFAULT_THEMES;
  }

  async getYears(auth?: AuthContext): Promise<MediaYear[]> {
    const currentYear = new Date().getFullYear();
    const years: MediaYear[] = [];
    for (let i = currentYear; i >= 1900; i--) {
      years.push({ Name: i.toString(), Value: i });
    }
    return years;
  }

  async getRatings(auth?: AuthContext): Promise<MediaRating[]> {
    try {
        const { tmdbDefaultRegion } = getRuntimeConfig();
        const region = auth?.watchRegion || tmdbDefaultRegion;
        const [movieData, tvData] = await Promise.all([
            this.fetchTmdb<any>('certification/movie/list'),
            this.fetchTmdb<any>('certification/tv/list').catch(() => null),
        ]);
        const pick = (data: any) => data?.certifications?.[region] || data?.certifications?.[tmdbDefaultRegion] || [];
        const seen = new Set<string>();
        const ratings: MediaRating[] = [];
        for (const c of [...pick(movieData), ...pick(tvData)]) {
            const value = c?.certification;
            if (!value || seen.has(value)) continue;
            seen.add(value);
            ratings.push({ Name: value, Value: value });
        }
        return ratings;
    } catch (e) {
        return []; 
    }
  }

  async getLibraries(auth?: AuthContext): Promise<MediaLibrary[]> {
    return []; 
  }

  async getWatchProviders(region: string, auth?: AuthContext): Promise<WatchProvider[]> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }
    const data = await this.fetchTmdb<any>('watch/providers/movie', { watch_region: region });
    const providers: WatchProvider[] = data.results.map((p: any) => ({
      Id: p.provider_id.toString(),
      Name: p.provider_name,
      LogoPath: p.logo_path.startsWith('/') ? p.logo_path : `/${p.logo_path}`,
    }));

    // Deployment-level allowlist (TMDB_ALLOWED_WATCH_PROVIDERS): comma-separated,
    // case-insensitive substring match ("prime" matches "Amazon Prime Video").
    // Unset = full TMDB list. Single choke point: settings UI, filter drawer,
    // and hybrid deck metadata all consume this method.
    const allowlist = (appConfig.TMDB_ALLOWED_WATCH_PROVIDERS || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (allowlist.length === 0) return providers;

    return providers.filter((p) => {
      const name = p.Name.toLowerCase();
      return allowlist.some((entry) => name.includes(entry));
    });
  }

  async getRegions(auth?: AuthContext): Promise<MediaRegion[]> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }
    const data = await this.fetchTmdb<any[]>('configuration/countries');
    return data.map(c => ({
      Id: c.iso_3166_1,
      Name: c.english_name,
    })).sort((a, b) => a.Name.localeCompare(b.Name));
  }

  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string): string {
    const size = type === "Primary" ? "w500" : "original";
    if (tag) {
        const cleanTag = tag.startsWith('/') ? tag : `/${tag}`;
        return `https://image.tmdb.org/t/p/${size}${cleanTag}`;
    }
    if (itemId && (itemId.startsWith('/') || itemId.length > 20)) {
        const cleanTag = itemId.startsWith('/') ? itemId : `/${itemId}`;
        return `https://image.tmdb.org/t/p/${size}${cleanTag}`;
    }
    return "";
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");
    try {
        const details = await this.getItemDetails(itemId, auth, { includeUserState: false });
        const tag = type === "Backdrop" ? details.ImageTags?.Backdrop : details.ImageTags?.Primary;
        if (!tag) return "";
        const imageUrl = `https://image.tmdb.org/t/p/w200${tag.startsWith('/') ? tag : `/${tag}`}`; 
        return await getBlurDataURL(itemId, imageUrl) || "";
    } catch (e) {
        return "";
    }
  }

  async fetchImage(itemId: string, type: string, tag?: string, auth?: AuthContext, options?: Record<string, string>): Promise<ImageResponse> {
    const url = this.getImageUrl(itemId, type as any, tag);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      params: options
    });
    return {
      data: res.data,
      contentType: res.headers["content-type"] || "image/webp"
    };
  }

  async authenticate(username: string, password?: string, deviceId?: string, tmdbToken?: string): Promise<any> {
    return {
        id: `tmdb-${uuidv4()}`,
        name: username,
        accessToken: null,
        tmdbToken: tmdbToken,
    };
  }

  private mapMovieToMediaItem(movie: any, genreMap?: Map<string, string>): MediaItem {
    return {
      Id: movie.id.toString(),
      Name: movie.title,
      Overview: movie.overview,
      Language: movie.original_language,
      ProductionYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      CommunityRating: movie.vote_average,
      ImageTags: {
        Primary: movie.poster_path,
        Backdrop: movie.backdrop_path,
      },
      Genres: movie.genre_ids?.map((id: number) => genreMap?.get(id.toString())).filter(Boolean) || [], 
    };
  }

  private mapMovieDetailsToMediaItem(movie: any, region?: string): MediaItem {
    const people = [
        ...(movie.credits?.cast?.slice(0, 10).map((p: any) => ({
            Id: p.id.toString(),
            Name: p.name,
            Role: p.character,
            Type: "Actor",
            PrimaryImageTag: p.profile_path,
        })) || []),
        ...(movie.credits?.crew?.filter((p: any) => p.job === "Director").map((p: any) => ({
            Id: p.id.toString(),
            Name: p.name,
            Role: "Director",
            Type: "Director",
            PrimaryImageTag: p.profile_path,
        })) || [])
     ];
    
    let officialRating: string | undefined = undefined;
    const releaseDates = movie.release_dates?.results || [];
    const { tmdbDefaultRegion } = getRuntimeConfig();
    const targetRegion = region || tmdbDefaultRegion;
    const regionRelease = releaseDates.find((r: any) => r.iso_3166_1 === targetRegion) || releaseDates.find((r: any) => r.iso_3166_1 === tmdbDefaultRegion) || releaseDates[0];
    
    if (regionRelease) {
        officialRating = regionRelease.release_dates.find((rd: any) => rd.certification)?.certification;
    }

    return {
      Id: movie.id.toString(),
      Name: movie.title,
      OriginalTitle: movie.original_title,
      Overview: movie.overview,
      Language: movie.original_language,
      ProductionYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      CommunityRating: movie.vote_average,
      RunTimeTicks: movie.runtime ? movie.runtime * 60 * 10000000 : undefined,
      Taglines: movie.tagline ? [movie.tagline] : [],
      OfficialRating: officialRating,
      Genres: movie.genres?.map((g: any) => g.name),
      ImageTags: {
        Primary: movie.poster_path,
        Backdrop: movie.backdrop_path,
      },
      BackdropImageTags: movie.backdrop_path ? [movie.backdrop_path] : [],
      People: people,
      WatchProviders: this.mapWatchProviders(movie['watch/providers']?.results, region),
    };
  }

  private mapWatchProviders(results: any, preferredRegion?: string): WatchProvider[] {
    if (!results) return [];
    const providers = new Map<number, WatchProvider>();
    const processRegion = (regionCode: string) => {
        const data = results[regionCode];
        if (!data) return;
        const allTypes = [...(data.flatrate || []), ...(data.rent || []), ...(data.buy || []), ...(data.ads || []), ...(data.free || [])];
        for (const p of allTypes) {
            if (!providers.has(p.provider_id)) {
                providers.set(p.provider_id, {
                    Id: p.provider_id.toString(),
                    Name: p.provider_name,
                    LogoPath: p.logo_path.startsWith('/') ? p.logo_path : `/${p.logo_path}`
                });
            }
        }
    };
    if (preferredRegion && results[preferredRegion]) {
        processRegion(preferredRegion);
    } else {
        const regions = Object.keys(results);
        for (const r of regions) processRegion(r);
    }
    return Array.from(providers.values());
  }

  private applyTrendingFilters(items: MediaItem[], filters: SearchFilters): MediaItem[] {
    let result = items;
    if (filters.years && filters.years.length > 0) {
      const minYear = Math.min(...filters.years);
      const maxYear = Math.max(...filters.years);
      result = result.filter(i => i.ProductionYear && i.ProductionYear >= minYear && i.ProductionYear <= maxYear);
    }
    if (filters.minCommunityRating) {
      result = result.filter(i => (i.CommunityRating || 0) >= filters.minCommunityRating!);
    }
    return result;
  }
}
