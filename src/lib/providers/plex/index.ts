import { config as appConfig } from "@/lib/config";
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
import { plexClient, getPlexUrl, getPlexHeaders } from "@/lib/plex/api";
import { getCachedYears, getCachedGenres, getCachedLibraries, getCachedRatings } from "@/lib/plex/cached-queries";

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
    
    // If we have libraries filtered, we fetch from those sections
    // If not, we might need to fetch from all movie sections
    let allItems: any[] = [];
    
    const sections = await this.getLibraries(auth);
    const targetSections = filters.libraries && filters.libraries.length > 0 
      ? sections.filter(s => filters.libraries?.includes(s.Id))
      : sections.filter(s => s.CollectionType === "movies");

    for (const section of targetSections) {
        const url = getPlexUrl(`/library/sections/${section.Id}/all`, auth?.serverUrl);
        const params: any = {
            type: 1, // Movies
            'X-Plex-Container-Start': filters.offset || 0,
            'X-Plex-Container-Size': filters.limit || 50,
        };

        // Plex filtering is complex via URL params (e.g. ?genre=123)
        // For now, let's do basic fetching and we can refine later
        // Plex often uses "all" but you can filter with keys
        
        if (filters.genres && filters.genres.length > 0) {
            // This requires knowing the ID of the genre in Plex, which we get from getGenres
            // For now, we'll fetch all and filter in memory if needed, or 
            // better: implement proper Plex filtering if we have the IDs.
        }

        const res = await plexClient.get(url, { headers, params });
        const items = res.data.MediaContainer?.Metadata || [];
        allItems = [...allItems, ...items];
    }

    // Sort and limit if we combined from multiple sections
    if (filters.sortBy === "Random") {
        allItems = allItems.sort(() => Math.random() - 0.5);
    }

    return allItems.slice(0, filters.limit || 50).map(item => this.mapToMediaItem(item));
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const url = getPlexUrl(`/library/metadata/${id}`, auth?.serverUrl);
    const res = await plexClient.get(url, { headers: getPlexHeaders(token) });
    const item = res.data.MediaContainer?.Metadata?.[0];
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
    // If tag is provided, it's usually the Plex path (e.g. /library/metadata/123/thumb/123456789)
    if (tag) {
        return getPlexUrl(tag, auth?.serverUrl);
    }
    
    // Fallback: If itemId is a path, use it
    if (itemId.startsWith('/')) {
        return getPlexUrl(itemId, auth?.serverUrl);
    }

    // Otherwise, we might need to fetch details to get the image path, 
    // but Swiparr expects a sync URL construction if possible.
    // For Plex, we usually have the thumb/art paths in the items already.
    return "";
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    
    try {
        const details = await this.getItemDetails(itemId, auth);
        const tag = type === "Backdrop" ? details.ImageTags?.Backdrop : details.ImageTags?.Primary;
        if (!tag) return "";
        
        // Plex images often need the token even for thumbnails if not public
        const imageUrl = this.getImageUrl(itemId, (type || "Primary") as any, tag);
        const headers = getPlexHeaders(token);
        
        return await getBlurDataURL(itemId, imageUrl, headers) || "";
    } catch (e) {
        return "";
    }
  }

  async authenticate(username: string, password?: string, deviceId?: string, serverUrl?: string): Promise<any> {
    const token = password || appConfig.PLEX_TOKEN;
    if (!token) throw new Error("Plex Token is required");
    
    const headers = getPlexHeaders(token);
    const url = getPlexUrl("/myplex/account", serverUrl);
    const res = await plexClient.get(url, { headers });
    
    // Normalize to what Swiparr expects: { User: { Id, Name }, AccessToken }
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
      RunTimeTicks: item.duration ? item.duration * 10000 : undefined, // ms to ticks
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
      Studios: item.Studio ? [{ Name: item.Studio, Id: item.Studio }] : [],
      ImageTags: {
        Primary: item.thumb,
        Backdrop: item.art,
      },
      BackdropImageTags: item.art ? [item.art] : [],
      UserData: {
        IsFavorite: false, // Plex doesn't have a simple "Favorite" in the same way, but it has user rating/watchlist
        Likes: undefined,
      },
    };
  }
}
