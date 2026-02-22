import { config as appConfig } from "@/lib/config";
import { 
  MediaProvider, 
  ProviderCapabilities, 
  SearchFilters, 
  AuthContext,
  ImageResponse
} from "../types";

import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating 
} from "@/types/media";
import { plexClient, getPlexUrl, getPlexHeaders, getBestServerUrl } from "@/lib/plex/api";
import { getCachedYears, getCachedGenres, getCachedLibraries, getCachedRatings } from "@/lib/plex/cached-queries";
import { PlexContainerSchema } from "../schemas";

/**
 * Plex Provider
 * Uses REST API. Plex uses complex query parameters for advanced filtering.
 * Filter pattern: ?genre=ID&contentRating=ID&year=YEAR&sort=random
 */
export class PlexProvider implements MediaProvider {
  readonly name = "plex";
  
  readonly capabilities: ProviderCapabilities = {
    hasAuth: true,
    hasQuickConnect: false,
    hasWatchlist: true,
    hasLibraries: true,
    hasSettings: true,
    requiresServerUrl: true,
    isExperimental: false,
    hasStreamingSettings: false,
    isAdminPanel: true,
  };

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const headers = getPlexHeaders(token);
    
    let allItems: any[] = [];
    const sections = await this.getLibraries(auth);
    const targetSections = filters.libraries && filters.libraries.length > 0 
      ? sections.filter(s => filters.libraries?.includes(s.Id))
      : sections.filter(s => s.CollectionType === "movies");

    if (targetSections.length === 0) return [];

    // Distribute limit across sections
    const hasFilters = !!(filters.genres?.length || filters.years?.length || filters.ratings?.length || filters.minCommunityRating || filters.runtimeRange || filters.themes?.length || filters.unplayedOnly);
    const limitPerSection = Math.max(Math.ceil((filters.limit || 20) * (hasFilters ? 4 : 1.5) / targetSections.length), 20);

    for (const section of targetSections) {
        let resolvedGenres: string[] | undefined = undefined;
        if (filters.genres && filters.genres.length > 0) {
            resolvedGenres = await this.resolveGenreIds(filters.genres, auth);
        }

        // Build query for Plex Advanced Filtering
        const params: Record<string, any> = {
            type: 1, // Movies
            'X-Plex-Container-Start': filters.offset || 0,
            'X-Plex-Container-Size': limitPerSection,
            includeGuids: 1,
            includeCollections: 1,
            includeAdvanced: 1,
            includeMeta: 1,
        };

        if (filters.sortBy === "Random") {
            params.sort = "random";
        } else if (filters.sortBy === "Trending") {
            params.sort = "rating:desc";
        } else if (filters.sortBy === "Popular") {
            params.sort = "rating:desc,audienceRating:desc";
        } else if (filters.sortBy === "ProductionYear" || filters.sortBy === "Newest") {
            params.sort = "year:desc";
        } else if (filters.sortBy === "Top Rated") {
            params.sort = "audienceRating:desc";
        } else if (filters.sortBy === "SortName") {
            params.sort = "titleSort:asc";
        }

        if (filters.searchTerm) {
            params.title = filters.searchTerm;
        }

        if (filters.themes && filters.themes.length > 0) {
            params.label = filters.themes.join(',');
        }

        // Plex filtering usually requires internal IDs for genres/ratings
        // The cached-queries.ts should have resolved these already if they are in the filters
        if (resolvedGenres && resolvedGenres.length > 0) {
            params.genre = resolvedGenres.join(',');
        }
        if (filters.ratings && filters.ratings.length > 0) {
            params.contentRating = filters.ratings.join(',');
        }
        if (filters.years && filters.years.length > 0) {
            const minYear = Math.min(...filters.years);
            const maxYear = Math.max(...filters.years);
            params['year>='] = minYear;
            params['year<='] = maxYear;
        }

        if (filters.unplayedOnly) {
            params.unwatched = 1;
        }

        if (filters.minCommunityRating !== undefined && filters.minCommunityRating !== null) {
            params['audienceRating>='] = filters.minCommunityRating;
        }

        if (filters.runtimeRange) {
            const [min, max] = filters.runtimeRange;
            if (min) params['duration>='] = min * 60 * 1000;
            if (max && max < 240) params['duration<='] = max * 60 * 1000;
        }

        const url = getPlexUrl(`/library/sections/${section.Id}/all`, auth?.serverUrl);
        const res = await plexClient.get(url, { headers, params });
        const data = PlexContainerSchema.parse(res.data);
        let items = data.MediaContainer.Metadata || [];
        allItems = [...allItems, ...items];
    }

    // Secondary client-side limit if multiple sections merged
    return allItems.slice(0, filters.limit || 20).map(item => this.mapToMediaItem(item));
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const path = id.includes("/") ? id : `/library/metadata/${id}`;
    const url = getPlexUrl(path, auth?.serverUrl);
    const res = await plexClient.get(url, {
      headers: getPlexHeaders(token),
      params: {
        includeGuids: 1,
        includeCollections: 1,
        includeMeta: 1,
      },
    });
    const data = PlexContainerSchema.parse(res.data);
    const item = data.MediaContainer.Metadata?.[0];
    if (!item) throw new Error("Item not found");
    return this.mapToMediaItem(item);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const genres = await getCachedGenres(auth.accessToken, auth.deviceId, auth.userId, auth.serverUrl);
    return Array.from(genres);
  }

  async getThemes(auth?: AuthContext): Promise<string[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
        throw new Error("Auth credentials required");
    }
    const token = auth.accessToken;
    const headers = getPlexHeaders(token);
    
    try {
        const sections = await this.getLibraries(auth);
        const allLabels = new Set<string>();
        
        for (const section of sections) {
            const url = getPlexUrl(`/library/sections/${section.Id}/label`, auth.serverUrl);
            const res = await plexClient.get(url, { headers });
            const data = res.data.MediaContainer?.Directory || [];
            data.forEach((d: any) => allLabels.add(d.title));
            if (allLabels.size >= 15) break;
        }
        
        return Array.from(allLabels).slice(0, 15);
    } catch (e) {
        return [];
    }
  }

  async getYears(auth?: AuthContext): Promise<MediaYear[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const years = await getCachedYears(auth.accessToken, auth.deviceId, auth.userId, auth.serverUrl);
    return Array.from(years);
  }

  async getRatings(auth?: AuthContext): Promise<MediaRating[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const ratings = await getCachedRatings(auth.accessToken, auth.deviceId, auth.userId, auth.serverUrl);
    return ratings.map((r: any) => ({ Name: r, Value: r }));
  }

  async getLibraries(auth?: AuthContext): Promise<MediaLibrary[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const libraryItems = await getCachedLibraries(auth.accessToken, auth.deviceId, auth.userId, auth.serverUrl);
    return libraryItems
      .filter((l: any) => l.type === "movie")
      .map((l: any) => ({
        Id: l.key,
        Name: l.title,
        CollectionType: "movies",
      }));
  }

  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string, auth?: AuthContext): string {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const path = tag || itemId;
    if (path.startsWith('/')) {
        return getPlexUrl(`${path}?X-Plex-Token=${token}`, auth?.serverUrl);
    }
    return "";
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    try {
        const details = await this.getItemDetails(itemId, auth);
        const tag = type === "Backdrop" ? details.ImageTags?.Backdrop : details.ImageTags?.Primary;
        if (!tag) return "";
        const imageUrl = this.getImageUrl(itemId, (type || "Primary") as any, tag, auth);
        const headers = getPlexHeaders(token);
        return await getBlurDataURL(itemId, imageUrl, headers) || "";
    } catch (e) {
        return "";
    }
  }

  async fetchImage(itemId: string, type: string, tag?: string, auth?: AuthContext, options?: Record<string, string>): Promise<ImageResponse> {
    const url = this.getImageUrl(itemId, type as any, tag, auth);
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const headers = getPlexHeaders(token);
    const res = await plexClient.get(url, {
      responseType: "arraybuffer",
      headers,
      params: options
    });
    return {
      data: res.data,
      contentType: res.headers["content-type"] || "image/webp"
    };
  }

  async authenticate(username: string, password?: string, deviceId?: string, serverUrl?: string): Promise<any> {
    const token = password || appConfig.PLEX_TOKEN;
    if (!token) throw new Error("Plex Token is required");
    
    // Try to discover the best server URL to avoid TLS certificate issues
    // This will prefer .plex.direct URLs over IP addresses for local HTTPS
    const discovered = await getBestServerUrl(token, serverUrl);
    const effectiveServerUrl = discovered?.serverUrl || serverUrl;
    
    const headers = getPlexHeaders(token);
    const url = getPlexUrl("/myplex/account", effectiveServerUrl);
    const res = await plexClient.get(url, { headers });
    const user = res.data.MyPlex;
    return {
      User: {
        Id: user.id?.toString() || username,
        Name: user.username || username,
      },
      AccessToken: discovered?.accessToken || token,
    };
  }

  private mapToMediaItem(item: any): MediaItem {
    const languageTags: string[] = [];

    if (item.Language) {
      languageTags.push(...item.Language.map((l: any) => l.tag).filter(Boolean));
    }

    if (item.Media) {
      for (const media of item.Media) {
        for (const part of media.Part || []) {
          for (const stream of part.Stream || []) {
            if (stream.languageCode) languageTags.push(stream.languageCode);
            if (stream.language) languageTags.push(stream.language);
            if (stream.title) languageTags.push(stream.title);
          }
        }
      }
    }

    const language = languageTags.length > 0 ? languageTags[0] : undefined;

    const directorPeople = item.Director?.map((d: any, idx: number) => ({
      Id: `director-${item.ratingKey}-${idx}`,
      Name: d.tag,
      Role: "Director",
      Type: "Director",
    })) || [];

    const castPeople = item.Role?.map((r: any, idx: number) => ({
      Id: (r.id ? r.id.toString() : `cast-${item.ratingKey}-${idx}`),
      Name: r.tag,
      Role: r.role || "Actor",
      Type: "Actor",
      PrimaryImageTag: r.thumb,
    })) || [];

    return {
      Id: item.ratingKey,
      Name: item.title,
      OriginalTitle: item.originalTitle,
      Language: language,
      RunTimeTicks: item.duration ? item.duration * 10000 : undefined, 
      ProductionYear: item.year,
      CommunityRating: item.audienceRating ?? item.rating,
      Overview: item.summary,
      Taglines: item.tagline ? [item.tagline] : [],
      OfficialRating: item.contentRating,
      Genres: item.Genre?.map((g: any) => g.tag) || [],
      People: [...castPeople, ...directorPeople],
      ImageTags: {
        Primary: item.thumb,
        Backdrop: item.art,
      },
      BackdropImageTags: item.art ? [item.art] : [],
      UserData: {
        IsFavorite: false,
      },
    };
  }

  private async resolveGenreIds(genres: string[], auth?: AuthContext): Promise<string[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) return genres;
    try {
      const cached = await getCachedGenres(auth.accessToken, auth.deviceId, auth.userId, auth.serverUrl);
      const byName = new Map(cached.map((g: any) => [g.Name.toLowerCase(), g.Id]));
      return genres.map((g) => byName.get(g.toLowerCase()) || g);
    } catch (e) {
      return genres;
    }
  }
}
