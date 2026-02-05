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
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const sections = await this.getLibraries(auth);
    const movieSections = sections.filter(s => s.CollectionType === "movies");
    
    let allGenres = new Map<string, MediaGenre>();
    
    for (const section of movieSections) {
        const url = getPlexUrl(`/library/sections/${section.Id}/genre`, auth?.serverUrl);
        const res = await plexClient.get(url, { headers: getPlexHeaders(token) });
        const genres = res.data.MediaContainer?.Directory || [];
        genres.forEach((g: any) => {
            allGenres.set(g.title, { Id: g.fastKey || g.key, Name: g.title });
        });
    }
    
    return Array.from(allGenres.values());
  }

  async getYears(auth?: AuthContext): Promise<MediaYear[]> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const sections = await this.getLibraries(auth);
    const movieSections = sections.filter(s => s.CollectionType === "movies");
    
    let allYears = new Map<number, MediaYear>();
    
    for (const section of movieSections) {
        const url = getPlexUrl(`/library/sections/${section.Id}/year`, auth?.serverUrl);
        const res = await plexClient.get(url, { headers: getPlexHeaders(token) });
        const years = res.data.MediaContainer?.Directory || [];
        years.forEach((y: any) => {
            const val = parseInt(y.title);
            if (!isNaN(val)) {
                allYears.set(val, { Name: y.title, Value: val });
            }
        });
    }
    
    return Array.from(allYears.values()).sort((a, b) => b.Value - a.Value);
  }

  async getRatings(auth?: AuthContext): Promise<MediaRating[]> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const sections = await this.getLibraries(auth);
    const movieSections = sections.filter(s => s.CollectionType === "movies");
    
    let allRatings = new Set<string>();
    
    for (const section of movieSections) {
        const url = getPlexUrl(`/library/sections/${section.Id}/contentRating`, auth?.serverUrl);
        const res = await plexClient.get(url, { headers: getPlexHeaders(token) });
        const ratings = res.data.MediaContainer?.Directory || [];
        ratings.forEach((r: any) => {
            if (r.title) allRatings.add(r.title);
        });
    }
    
    return Array.from(allRatings).sort().map(r => ({ Name: r, Value: r }));
  }

  async getLibraries(auth?: AuthContext): Promise<MediaLibrary[]> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const url = getPlexUrl("/library/sections", auth?.serverUrl);
    const res = await plexClient.get(url, { headers: getPlexHeaders(token) });
    
    return (res.data.MediaContainer?.Directory || [])
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
