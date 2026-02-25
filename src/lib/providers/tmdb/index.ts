import { v4 as uuidv4 } from "uuid";
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
import { TmdbSearchResponseSchema, TmdbMovieSchema } from "../schemas";
import { logger } from "@/lib/logger";
import { DEFAULT_THEMES, TMDB_DEFAULT_REGION } from "@/lib/constants";

/**
 * TMDB Provider
 * Uses pure REST API calls.
 * Official Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */
export class TmdbProvider implements MediaProvider {
  readonly name = ProviderType.TMDB;
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
        discoverParams.watch_region = filters.watchRegion || auth?.watchRegion || TMDB_DEFAULT_REGION;
        discoverParams.with_watch_monetization_types = 'flatrate|free|ads|rent|buy';
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
        const region = filters.watchRegion || auth?.watchRegion || TMDB_DEFAULT_REGION;
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

  async getItemDetails(id: string, auth?: AuthContext, _options?: { includeUserState?: boolean }): Promise<MediaItem> {
    if (auth?.tmdbToken) {
        this.apiKey = auth.tmdbToken;
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
    const data = await this.fetchTmdb<{ genres: { id: number; name: string }[] }>('genre/movie/list');
    return data.genres.map(g => ({ Id: g.id.toString(), Name: g.name }));
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
        const region = auth?.watchRegion || TMDB_DEFAULT_REGION;
        const data = await this.fetchTmdb<any>('certification/movie/list');
        const certs = data.certifications?.[region] || data.certifications?.[TMDB_DEFAULT_REGION] || [];
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
    const data = await this.fetchTmdb<any>('watch/providers/movie', { watch_region: region });
    return data.results.map((p: any) => ({
      Id: p.provider_id.toString(),
      Name: p.provider_name,
      LogoPath: p.logo_path.startsWith('/') ? p.logo_path : `/${p.logo_path}`,
    }));
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
    const targetRegion = region || TMDB_DEFAULT_REGION;
    const regionRelease = releaseDates.find((r: any) => r.iso_3166_1 === targetRegion) || releaseDates.find((r: any) => r.iso_3166_1 === TMDB_DEFAULT_REGION) || releaseDates[0];
    
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
