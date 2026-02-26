import { config as appConfig } from "@/lib/config";
import { 
  MediaProvider, 
  ProviderCapabilities, 
  SearchFilters, 
  AuthContext,
  ImageResponse,
  ProviderType
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
import { TmdbSearchResponseSchema, TmdbTvSearchResponseSchema } from "../schemas";
import { logger } from "@/lib/logger";
import { DEFAULT_THEMES } from "@/lib/constants";
import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * TMDB Provider
 * Uses pure REST API calls.
 * Official Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */
export class TmdbProvider implements MediaProvider {
  readonly name: string = "tmdb";
  private apiKey: string;
  
  readonly capabilities: ProviderCapabilities = {
    hasAuth: false,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: true,
    requiresServerUrl: false,
    isExperimental: false,
    hasStreamingSettings: true,
    isAdminPanel: false,
  };

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

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }

    const genres = await this.getGenres(auth);
    const genreIdMap = new Map(genres.map(g => [g.Name, g.Id]));
    const genreNameMap = new Map(genres.map(g => [g.Id, g.Name]));

    const mediaType = filters.mediaType ?? "movie";
    const pageSize = mediaType === "both" ? 40 : 20;
    const page = filters.offset ? Math.floor(filters.offset / pageSize) + 1 : 1;

    // --- Search ---
    if (filters.searchTerm) {
        const results: MediaItem[] = [];
        if (mediaType === "movie" || mediaType === "both") {
            const data = await this.fetchTmdb<any>('search/movie', { query: filters.searchTerm, page });
            const res = TmdbSearchResponseSchema.parse(data);
            results.push(...res.results.map(m => this.mapMovieToMediaItem(m, genreNameMap)));
        }
        if (mediaType === "tv" || mediaType === "both") {
            const data = await this.fetchTmdb<any>('search/tv', { query: filters.searchTerm, page });
            const res = TmdbTvSearchResponseSchema.parse(data);
            results.push(...res.results.map(s => this.mapTvToMediaItem(s, genreNameMap)));
        }
        return results;
    }

    // --- Trending ---
    if (filters.sortBy === "Trending" && (!filters.watchProviders || filters.watchProviders.length === 0)) {
        const results: MediaItem[] = [];
        if (mediaType === "movie" || mediaType === "both") {
            const data = await this.fetchTmdb<any>('trending/movie/week', { page });
            const res = TmdbSearchResponseSchema.parse(data);
            results.push(...res.results.map(m => this.mapMovieToMediaItem(m, genreNameMap)));
        }
        if (mediaType === "tv" || mediaType === "both") {
            const data = await this.fetchTmdb<any>('trending/tv/week', { page });
            const res = TmdbTvSearchResponseSchema.parse(data);
            results.push(...res.results.map(s => this.mapTvToMediaItem(s, genreNameMap)));
        }
        return this.applyTrendingFilters(results, filters);
    }

    // --- Discover ---
    // Docs: https://developer.themoviedb.org/reference/discover-movie-get
    const buildDiscoverParams = (type: "movie" | "tv"): Record<string, any> => {
        const sortBy = filters.sortBy === "Popular" ? "popularity.desc" :
                       filters.sortBy === "Top Rated" ? "vote_average.desc" :
                       filters.sortBy === "Newest" ? (type === "movie" ? "primary_release_date.desc" : "first_air_date.desc") :
                       "popularity.desc";
        const params: Record<string, any> = {
            page,
            with_genres: filters.genres?.map(name => genreIdMap.get(name)).filter(Boolean).join(','),
            sort_by: sortBy,
        };

        if (filters.watchProviders && filters.watchProviders.length > 0) {
            params.with_watch_providers = filters.watchProviders.join('|');
            params.watch_region = filters.watchRegion || auth?.watchRegion || 'US';
            params.with_watch_monetization_types = 'flatrate|free|ads|rent|buy';
        }

        if (filters.years && filters.years.length > 0) {
            const minYear = Math.min(...filters.years);
            const maxYear = Math.max(...filters.years);
            if (type === "movie") {
                if (minYear === maxYear) {
                    params.primary_release_year = minYear;
                } else {
                    params['primary_release_date.gte'] = `${minYear}-01-01`;
                    params['primary_release_date.lte'] = `${maxYear}-12-31`;
                }
            } else {
                params['first_air_date.gte'] = `${minYear}-01-01`;
                params['first_air_date.lte'] = `${maxYear}-12-31`;
            }
        }

        if (filters.minCommunityRating && filters.minCommunityRating > 0) {
            params['vote_average.gte'] = filters.minCommunityRating;
        }

        if (filters.runtimeRange) {
            const [min, max] = filters.runtimeRange;
            if (min > 0) params['with_runtime.gte'] = min;
            if (max < 240) params['with_runtime.lte'] = max;
        }

        if (filters.tmdbLanguages && filters.tmdbLanguages.length > 0) {
            params.with_original_language = filters.tmdbLanguages.join('|');
            logger.debug("[TMDBProvider.getItems] Applying language filter:", { languages: filters.tmdbLanguages });
        }

        return params;
    };

    // Keywords (themes) — movies only, TV keyword search works differently
    let keywordIds: number[] = [];

    if (filters.themes && filters.themes.length > 0) {
        const themeKeywords = await Promise.all(filters.themes.map(async (theme) => {
            const searchData = await this.fetchTmdb<any>('search/keyword', { query: theme });
            return searchData.results?.[0]?.id;
        }));
        keywordIds = themeKeywords.filter(Boolean);
    }

    // Rating/certification — movies only (TMDB TV certifications are structured differently)
    const regionMapping: Record<string, string> = {
        'US': 'US', 'UK': 'GB', 'DE': 'DE', 'FR': 'FR', 'SE': 'SE',
        'AU': 'AU', 'CA': 'CA', 'ES': 'ES', 'IT': 'IT', 'JP': 'JP',
        'NL': 'NL', 'NO': 'NO', 'NZ': 'NZ', 'RU': 'RU',
    };

    const movieResults: MediaItem[] = [];
    const tvResults: MediaItem[] = [];

    if (mediaType === "movie" || mediaType === "both") {
        const movieParams = buildDiscoverParams("movie");
        if (keywordIds.length > 0) movieParams.with_keywords = keywordIds.join('|');
        if (filters.ratings && filters.ratings.length > 0) {
            const region = filters.watchRegion || auth?.watchRegion || 'US';
            movieParams.certification_country = regionMapping[region] || 'US';
            movieParams.certification = filters.ratings.join('|');
            logger.debug("[TMDBProvider.getItems] Applying certification filter:", { region, ratings: filters.ratings });
        }
        if (filters.sortBy === "Random") {
            try {
                const initialRes = await this.fetchTmdb<any>('discover/movie', { ...movieParams, page: 1 });
                movieParams.page = Math.floor(Math.random() * Math.min(initialRes.total_pages, 500)) + 1;
            } catch {
                movieParams.page = Math.floor(Math.random() * 20) + 1;
            }
        }
        const data = await this.fetchTmdb<any>('discover/movie', movieParams);
        const res = TmdbSearchResponseSchema.parse(data);
        movieResults.push(...res.results.map(m => {
            const item = this.mapMovieToMediaItem(m, genreNameMap);
            if (filters.ratings && filters.ratings.length === 1) item.OfficialRating = filters.ratings[0];
            return item;
        }));
    }

    if (mediaType === "tv" || mediaType === "both") {
        const tvParams = buildDiscoverParams("tv");
        if (filters.sortBy === "Random") {
            try {
                const initialRes = await this.fetchTmdb<any>('discover/tv', { ...tvParams, page: 1 });
                tvParams.page = Math.floor(Math.random() * Math.min(initialRes.total_pages, 500)) + 1;
            } catch {
                tvParams.page = Math.floor(Math.random() * 20) + 1;
            }
        }
        const data = await this.fetchTmdb<any>('discover/tv', tvParams);
        const res = TmdbTvSearchResponseSchema.parse(data);
        tvResults.push(...res.results.map(s => this.mapTvToMediaItem(s, genreNameMap)));
    }

    // Interleave movies and TV shows so both appear throughout the deck
    if (movieResults.length > 0 && tvResults.length > 0) {
        const interleaved: MediaItem[] = [];
        const len = Math.max(movieResults.length, tvResults.length);
        for (let i = 0; i < len; i++) {
            if (i < movieResults.length) interleaved.push(movieResults[i]);
            if (i < tvResults.length) interleaved.push(tvResults[i]);
        }
        return interleaved;
    }

    return [...movieResults, ...tvResults];
  }

  async getItemDetails(id: string, auth?: AuthContext, _options?: { includeUserState?: boolean }): Promise<MediaItem> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }
    if (id.startsWith('tv-')) {
        const tmdbId = id.slice(3);
        const show = await this.fetchTmdb<any>(`tv/${tmdbId}`, {
            append_to_response: 'credits,images,watch/providers,content_ratings'
        });
        return this.mapTvDetailsToMediaItem(show, auth?.watchRegion);
    }
    const movie = await this.fetchTmdb<any>(`movie/${id}`, {
        append_to_response: 'credits,images,watch/providers,release_dates'
    });
    return this.mapMovieDetailsToMediaItem(movie, auth?.watchRegion);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
    }
    const [movieData, tvData] = await Promise.all([
        this.fetchTmdb<{ genres: { id: number; name: string }[] }>('genre/movie/list'),
        this.fetchTmdb<{ genres: { id: number; name: string }[] }>('genre/tv/list'),
    ]);
    const seen = new Set<string>();
    const merged: MediaGenre[] = [];
    for (const g of [...movieData.genres, ...tvData.genres]) {
        if (!seen.has(g.name)) {
            seen.add(g.name);
            merged.push({ Id: g.id.toString(), Name: g.name });
        }
    }
    return merged;
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
        const data = await this.fetchTmdb<any>('certification/movie/list');
        const certs = data.certifications?.[region] || data.certifications?.[tmdbDefaultRegion] || [];
        return certs.map((c: any) => ({ Name: c.certification, Value: c.certification }));
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
    const [movieData, tvData] = await Promise.all([
        this.fetchTmdb<any>('watch/providers/movie', { watch_region: region }),
        this.fetchTmdb<any>('watch/providers/tv', { watch_region: region }),
    ]);
    const seen = new Set<number>();
    const providers: WatchProvider[] = [];
    for (const p of [...movieData.results, ...tvData.results]) {
        if (!seen.has(p.provider_id)) {
            seen.add(p.provider_id);
            providers.push({
                Id: p.provider_id.toString(),
                Name: p.provider_name,
                LogoPath: p.logo_path.startsWith('/') ? p.logo_path : `/${p.logo_path}`,
            });
        }
    }
    return providers;
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
        id: `tmdb-${username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
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

  private mapTvToMediaItem(show: any, genreMap?: Map<string, string>): MediaItem {
    return {
      Id: `tv-${show.id}`,
      Name: show.name,
      Overview: show.overview,
      ProductionYear: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
      CommunityRating: show.vote_average,
      ImageTags: {
        Primary: show.poster_path,
        Backdrop: show.backdrop_path,
      },
      Genres: show.genre_ids?.map((id: number) => genreMap?.get(id.toString())).filter(Boolean) || [],
    };
  }

  private mapTvDetailsToMediaItem(show: any, region?: string): MediaItem {
    const people = [
        ...(show.credits?.cast?.slice(0, 10).map((p: any) => ({
            Id: p.id.toString(),
            Name: p.name,
            Role: p.character,
            Type: "Actor",
            PrimaryImageTag: p.profile_path,
        })) || []),
        ...(show.credits?.crew?.filter((p: any) => p.job === "Executive Producer" || p.job === "Creator").map((p: any) => ({
            Id: p.id.toString(),
            Name: p.name,
            Role: p.job,
            Type: "Director",
            PrimaryImageTag: p.profile_path,
        })) || []),
    ];

    const runtime = show.episode_run_time?.[0];

    return {
      Id: `tv-${show.id}`,
      Name: show.name,
      OriginalTitle: show.original_name,
      Overview: show.overview,
      ProductionYear: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
      CommunityRating: show.vote_average,
      RunTimeTicks: runtime ? runtime * 60 * 10000000 : undefined,
      Taglines: show.tagline ? [show.tagline] : [],
      Genres: show.genres?.map((g: any) => g.name),
      ImageTags: {
        Primary: show.poster_path,
        Backdrop: show.backdrop_path,
      },
      BackdropImageTags: show.backdrop_path ? [show.backdrop_path] : [],
      People: people,
      WatchProviders: this.mapWatchProviders(show['watch/providers']?.results, region),
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
