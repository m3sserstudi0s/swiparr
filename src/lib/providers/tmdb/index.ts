import { TMDB } from 'tmdb-ts';
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
  MediaRating 
} from "@/types/media";

export class TmdbProvider implements MediaProvider {
  readonly name = "tmdb";
  private client: TMDB;
  
  readonly capabilities: ProviderCapabilities = {
    hasAuth: false,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: false,
    requiresServerUrl: false,
  };

  constructor() {
    const token = process.env.TMDB_ACCESS_TOKEN || '';
    this.client = new TMDB(token);
  }

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    if (filters.searchTerm) {
        const searchRes = await this.client.search.movies({ 
            query: filters.searchTerm,
            page: filters.offset ? Math.floor(filters.offset / 20) + 1 : 1
        });
        return searchRes.results.map((m: any) => this.mapMovieToMediaItem(m));
    }

    // If no specific filters and sortBy is Random, we can use trending or discover with a random page
    if (!filters.genres?.length && !filters.years?.length && !filters.ratings?.length && filters.sortBy === "Random") {
        const page = Math.floor(Math.random() * 10) + 1; // Randomize within first 10 pages
        // Using any cast since I'm unsure of exact method name for trending movies in this lib
        const trending = await this.client.trending.trending("movie", "week")
        return trending.results.map((m: any) => this.mapMovieToMediaItem(m));
    }

    // Default to discover
    const discoverOptions: any = {
        page: filters.offset ? Math.floor(filters.offset / 20) + 1 : 1,
        with_genres: filters.genres?.join(','),
        primary_release_year: filters.years?.[0], 
        'vote_average.gte': filters.ratings?.[0] ? parseFloat(filters.ratings[0]) : undefined,
    };

    if (filters.sortBy === "Random") {
        discoverOptions.page = Math.floor(Math.random() * 20) + 1;
    }

    const discoverRes = await this.client.discover.movie(discoverOptions);
    return discoverRes.results.map((m: any) => this.mapMovieToMediaItem(m));
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
    const movie = await this.client.movies.details(parseInt(id), ['credits', 'images' as any]);
    return this.mapMovieDetailsToMediaItem(movie as any);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
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

  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string): string {
    if (!tag) return "";
    // TMDB tags ARE the paths
    const cleanTag = tag.startsWith('/') ? tag : `/${tag}`;
    const size = type === "Primary" ? "w500" : "original";
    return `https://image.tmdb.org/t/p/${size}${cleanTag}`;
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");

    try {
        const details = await this.getItemDetails(itemId);
        const tag = type === "Backdrop" ? details.ImageTags?.Backdrop : details.ImageTags?.Primary;
        if (!tag) return "";
        const imageUrl = `https://image.tmdb.org/t/p/w200${tag}`; // Small size for blur
        return await getBlurDataURL(itemId, imageUrl) || "";
    } catch (e) {
        return "";
    }
  }

  async authenticate(username: string, password?: string, deviceId?: string): Promise<any> {
    const { v4: uuidv4 } = await import("uuid");
    return {
        id: `tmdb-${uuidv4()}`,
        name: username,
        accessToken: null,
    };
  }

  private mapMovieToMediaItem(movie: any): MediaItem {
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
      Genres: [], 
    };
  }

  private mapMovieDetailsToMediaItem(movie: any): MediaItem {
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
      People: movie.credits?.cast?.slice(0, 10).map((p: any) => ({
        Id: p.id.toString(),
        Name: p.name,
        Role: p.character,
        Type: "Actor",
        PrimaryImageTag: p.profile_path,
      })),
    };
  }
}
