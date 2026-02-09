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
import { plexClient, getPlexUrl, getPlexHeaders } from "@/lib/plex/api";
import { getCachedYears, getCachedGenres, getCachedLibraries, getCachedRatings } from "@/lib/plex/cached-queries";
import { PlexContainerSchema, PlexMetadataSchema } from "../schemas";

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

    for (const section of targetSections) {
        // Build query for Plex Advanced Filtering
        // Docs (Community): https://github.com/Arcanemagus/plex-api/wiki/Library-Sections
        const params: Record<string, any> = {
            type: 1, // Movies
            'X-Plex-Container-Start': filters.offset || 0,
            'X-Plex-Container-Size': filters.limit || 50,
        };

        if (filters.sortBy === "Random") {
            params.sort = "random";
        } else if (filters.sortBy === "ProductionYear" || filters.sortBy === "Newest") {
            params.sort = "year:desc";
        } else if (filters.sortBy === "Popular") {
            params.sort = "rating:desc";
        } else if (filters.sortBy === "Top Rated") {
            params.sort = "audienceRating:desc";
        }

        if (filters.searchTerm) {
            params.title = filters.searchTerm;
        }

        if (filters.themes && filters.themes.length > 0) {
            params.label = filters.themes.join(',');
        }

        // Plex filtering usually requires internal IDs for genres/ratings
        // The cached-queries.ts should have resolved these already if they are in the filters
        if (filters.genres && filters.genres.length > 0) {
            params.genre = filters.genres.join(',');
        }
        if (filters.ratings && filters.ratings.length > 0) {
            params.contentRating = filters.ratings.join(',');
        }
        if (filters.years && filters.years.length > 0) {
            params.year = filters.years.join(',');
        }

        if (filters.unplayedOnly) {
            params.unwatched = 1;
        }

        const url = getPlexUrl(`/library/sections/${section.Id}/all`, auth?.serverUrl);
        const res = await plexClient.get(url, { headers, params });
        const data = PlexContainerSchema.parse(res.data);
        const items = data.MediaContainer.Metadata || [];
        allItems = [...allItems, ...items];
    }

    // Secondary client-side limit if multiple sections merged
    return allItems.slice(0, filters.limit || 50).map(item => this.mapToMediaItem(item));
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const url = getPlexUrl(`/library/metadata/${id}`, auth?.serverUrl);
    const res = await plexClient.get(url, { headers: getPlexHeaders(token) });
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
    const headers = getPlexHeaders(token);
    const url = getPlexUrl("/myplex/account", serverUrl);
    const res = await plexClient.get(url, { headers });
    const user = res.data.MyPlex;
    return {
      User: {
        Id: user.id?.toString() || username,
        Name: user.username || username,
      },
      AccessToken: token,
    };
  }

  private mapToMediaItem(item: any): MediaItem {
    return {
      Id: item.ratingKey,
      Name: item.title,
      OriginalTitle: item.originalTitle,
      RunTimeTicks: item.duration ? item.duration * 10000 : undefined, 
      ProductionYear: item.year,
      CommunityRating: item.rating,
      Overview: item.summary,
      Taglines: item.tagline ? [item.tagline] : [],
      OfficialRating: item.contentRating,
      Genres: item.Genre?.map((g: any) => g.tag) || [],
      People: [
          ...(item.Role?.map((r: any) => ({
              Name: r.tag,
              Id: r.id?.toString() || r.tag,
              Role: r.role,
              Type: "Actor",
              PrimaryImageTag: r.thumb,
          })) || []),
          ...(item.Director?.map((d: any) => ({
              Name: d.tag,
              Id: d.id?.toString() || d.tag,
              Role: "Director",
              Type: "Director",
          })) || [])
      ],
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
}
