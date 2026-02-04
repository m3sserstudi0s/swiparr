import { MovieQueryOptions, TMDB } from 'tmdb-ts';
import { v4 as uuidv4 } from "uuid";
import { 
  MediaProvider, 
  ProviderCapabilities, 
  SearchFilters, 
  AuthContext 
} from "../types";
import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating,
  WatchProvider,
  MediaRegion
} from "@/types/media";

export class TmdbProvider implements MediaProvider {
  readonly name = "tmdb";
  private client: TMDB;
  
  readonly capabilities: ProviderCapabilities = {
    hasAuth: false,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: true,
    requiresServerUrl: false,
    isExperimental: false,
  };

  constructor(token?: string) {
    const finalToken = token || process.env.TMDB_ACCESS_TOKEN || '';
    this.client = new TMDB(finalToken);
  }

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    if (auth?.tmdbToken) {
        this.client = new TMDB(auth.tmdbToken);
    }
    const genres = await this.getGenres(auth);
    const genreIdMap = new Map(genres.map(g => [g.Name, g.Id]));
    const genreNameMap = new Map(genres.map(g => [g.Id, g.Name]));

    if (filters.searchTerm) {
        const searchRes = await this.client.search.movies({ 
            query: filters.searchTerm,
            page: filters.offset ? Math.floor(filters.offset / 20) + 1 : 1
        });
        return searchRes.results.map((m: any) => this.mapMovieToMediaItem(m, genreNameMap));
    }

    // Default to discover
    const discoverOptions: MovieQueryOptions = {
        page: filters.offset ? Math.floor(filters.offset / 20) + 1 : 1,
        with_genres: filters.genres?.map(name => genreIdMap.get(name)).filter(Boolean).join(','),
    };

    if (filters.watchProviders && filters.watchProviders.length > 0) {
        discoverOptions.with_watch_providers = filters.watchProviders.join('|');
        discoverOptions.watch_region = filters.watchRegion || auth?.watchRegion || 'SE';
        (discoverOptions as any).with_watch_monetization_types = 'flatrate|free|ads|rent|buy';
    }

    if (filters.years && filters.years.length > 0) {
        const minYear = Math.min(...filters.years);
        const maxYear = Math.max(...filters.years);
        if (minYear === maxYear) {
            discoverOptions.primary_release_year = minYear;
        } else {
            discoverOptions['primary_release_date.gte'] = `${minYear}-01-01`;
            discoverOptions['primary_release_date.lte'] = `${maxYear}-12-31`;
        }
    }

    if (filters.minCommunityRating && filters.minCommunityRating > 0) {
        discoverOptions['vote_average.gte'] = filters.minCommunityRating;
    }

    // If no specific filters and sortBy is Random, we can use trending or discover with a random page
    if (!filters.genres?.length && !filters.years?.length && !filters.ratings?.length && !filters.watchProviders?.length && !filters.minCommunityRating && filters.sortBy === "Random") {
        const page = Math.floor(Math.random() * 10) + 1;
        const trending = await this.client.trending.trending("movie", "week", { page });
        return trending.results.map((m: any) => this.mapMovieToMediaItem(m, genreNameMap));
    }

    if (filters.sortBy === "Random") {
        // To get better randomness with discover, we first get total pages
        try {
            const initialRes = await this.client.discover.movie({ ...discoverOptions, page: 1 });
            const totalPages = Math.min(initialRes.total_pages, 500); // TMDB limits to 500 pages for discover
            discoverOptions.page = Math.floor(Math.random() * totalPages) + 1;
        } catch (e) {
            discoverOptions.page = Math.floor(Math.random() * 20) + 1;
        }
    }

    const discoverRes = await this.client.discover.movie(discoverOptions);
    return discoverRes.results.map((m: any) => this.mapMovieToMediaItem(m, genreNameMap));
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
    if (auth?.tmdbToken) {
        this.client = new TMDB(auth.tmdbToken);
    }
    const movie = await this.client.movies.details(parseInt(id), ['credits', 'images' as any, 'watch/providers' as any]);
    return this.mapMovieDetailsToMediaItem(movie as any, auth?.watchRegion);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    if (auth?.tmdbToken) {
        this.client = new TMDB(auth.tmdbToken);
    }
    const res = await this.client.genres.movies();
    return res.genres.map(g => ({ Id: g.id.toString(), Name: g.name }));
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
    return []; // Return empty so hook uses fallback
  }

  async getLibraries(auth?: AuthContext): Promise<MediaLibrary[]> {
    return []; 
  }

  async getWatchProviders(region: string, auth?: AuthContext): Promise<WatchProvider[]> {
    if (auth?.tmdbToken) {
        this.client = new TMDB(auth.tmdbToken);
    }
    const res = await this.client.watchProviders.getMovieProviders({ watch_region: region as any });
    return res.results.map(p => ({
      Id: p.provider_id.toString(),
      Name: p.provider_name,
      LogoPath: p.logo_path.startsWith('/') ? p.logo_path : `/${p.logo_path}`,
    }));
  }

  async getRegions(auth?: AuthContext): Promise<MediaRegion[]> {
    if (auth?.tmdbToken) {
        this.client = new TMDB(auth.tmdbToken);
    }
    const res = await this.client.configuration.getCountries();
    return res.map(c => ({
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
    
    // Fallback if no tag provided but we have an itemId that might be the path
    if (itemId && (itemId.startsWith('/') || itemId.length > 20)) {
        const cleanTag = itemId.startsWith('/') ? itemId : `/${itemId}`;
        return `https://image.tmdb.org/t/p/${size}${cleanTag}`;
    }

    return "";
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");

    try {
        const details = await this.getItemDetails(itemId, auth);
        const tag = type === "Backdrop" ? details.ImageTags?.Backdrop : details.ImageTags?.Primary;
        if (!tag) return "";
        const imageUrl = `https://image.tmdb.org/t/p/w200${tag.startsWith('/') ? tag : `/${tag}`}`; 
        return await getBlurDataURL(itemId, imageUrl) || "";
    } catch (e) {
        return "";
    }
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

    return {
      Id: movie.id.toString(),
      Name: movie.title,
      OriginalTitle: movie.original_title,
      Overview: movie.overview,
      ProductionYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      CommunityRating: movie.vote_average,
      RunTimeTicks: movie.runtime ? movie.runtime * 60 * 10000000 : undefined,
      Taglines: movie.tagline ? [movie.tagline] : [],
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
        // Fallback: process all regions but prioritize some common ones if we want to be generous
        // For now, if no region, we still aggregate all as before to not break things
        const regions = Object.keys(results);
        for (const r of regions) processRegion(r);
    }

    return Array.from(providers.values());
  }
}
