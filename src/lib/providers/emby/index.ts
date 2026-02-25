import { 
  MediaProvider, 
  ProviderCapabilities, 
  SearchFilters, 
  AuthContext,
  ImageResponse,
  ProviderType
} from "../types";
import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating 
} from "@/types/media";
import { apiClient, getEmbyUrl, getAuthenticatedHeaders } from "@/lib/emby/api";
import { JellyfinQueryResultSchema, JellyfinItemSchema } from "../schemas";
import { DEFAULT_THEMES } from "@/lib/constants";

/**
 * Emby Provider
 * Docs: https://dev.emby.media/reference/restapi/ItemService.html
 */
export class EmbyProvider implements MediaProvider {
  readonly name = ProviderType.EMBY;
  
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
    // If multiple libraries are selected, we need to fetch from each one and merge
    // Emby's ParentId only supports a single ID
    if (filters.libraries && filters.libraries.length > 1) {
      const allResults = await Promise.all(
        filters.libraries.map(libId => 
          this.getItems({ ...filters, libraries: [libId] }, auth)
        )
      );
      
      // Merge results
      const merged = allResults.flat();
      
      // Deduplicate by ID just in case
      const seen = new Set();
      const unique = merged.filter(item => {
        if (seen.has(item.Id)) return false;
        seen.add(item.Id);
        return true;
      });

      return unique.slice(0, filters.limit || 20);
    }

    const params: Record<string, any> = {
      IncludeItemTypes: "Movie",
      Recursive: true,
      Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres,ImageTags,BackdropImageTags,UserData,PreferredMetadataLanguage,ProductionLocations,MediaStreams",
      SortBy: filters.sortBy === "Random" ? "Random" : 
              filters.sortBy === "Trending" ? "CommunityRating" :
              filters.sortBy === "Popular" ? "CommunityRating" :
              filters.sortBy === "Newest" ? "PremiereDate" :
              filters.sortBy === "Top Rated" ? "CommunityRating" :
              (filters.sortBy || "SortName"),
      SortOrder: (filters.sortBy === "Random" || filters.sortBy === "Popular" || filters.sortBy === "Newest" || filters.sortBy === "Top Rated") ? "Descending" : "Ascending",
      ParentId: filters.libraries?.[0] || undefined,
      Genres: filters.genres?.join("|") || undefined, 
      Years: filters.years?.join(",") || undefined,
      OfficialRatings: filters.ratings?.join("|") || undefined,
      Tags: filters.themes?.join("|") || undefined,
      Filters: filters.unplayedOnly ? "IsUnplayed" : undefined,
      MinCommunityRating: filters.minCommunityRating || undefined, 
      MinRunTimeTicks: filters.runtimeRange?.[0] ? filters.runtimeRange[0] * 600000000 : undefined,
      MaxRunTimeTicks: (filters.runtimeRange?.[1] && filters.runtimeRange[1] < 240) ? filters.runtimeRange[1] * 600000000 : undefined,
      Limit: filters.limit || 20,
      StartIndex: filters.offset || 0,
      EnableUserData: true,
    };

    if (filters.searchTerm) {
      params.SearchTerm = filters.searchTerm;
    }

    const res = await apiClient.get(getEmbyUrl(`/Users/${auth?.userId}/Items`, auth?.serverUrl), {
      params,
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });

    const data = JellyfinQueryResultSchema.parse(res.data);
    let rawItems = data.Items;
    return rawItems.map((item) => this.mapToMediaItem(item));
  }

  async getItemDetails(id: string, auth?: AuthContext, _options?: { includeUserState?: boolean }): Promise<MediaItem> {
    const res = await apiClient.get(getEmbyUrl(`/Users/${auth?.userId}/Items/${id}`, auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    const data = JellyfinItemSchema.parse(res.data);
    return this.mapToMediaItem(data);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    const res = await apiClient.get(getEmbyUrl("/Genres", auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return (res.data.Items || []).map((g: any) => ({ Id: g.Name, Name: g.Name }));
  }

  async getThemes(auth?: AuthContext): Promise<string[]> {

    return DEFAULT_THEMES;
    
    /*
    // Use /Items/Filters2 to get all available tags for movies
    // This is the correct Emby API endpoint for getting filter values (same as Jellyfin)
    const res = await apiClient.get(getEmbyUrl("/Items/Filters2", auth?.serverUrl), {
      params: {
        userId: auth?.userId,
        includeItemTypes: "Movie",
        recursive: true,
      },
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });

    // The response contains a Tags array directly
    return (res.data.Tags || []).slice(0, 15);
    */
  }

  async getYears(auth?: AuthContext): Promise<MediaYear[]> {
    const res = await apiClient.get(getEmbyUrl("/Years", auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return (res.data.Items || []).map((y: any) => ({ Name: y.Name, Value: parseInt(y.Name) }));
  }

  async getRatings(auth?: AuthContext): Promise<MediaRating[]> {
    try {
      const res = await apiClient.get(getEmbyUrl("/Items/Filters2", auth?.serverUrl), {
        params: {
          userId: auth?.userId,
          includeItemTypes: "Movie",
          recursive: true,
        },
        headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
      });

      const ratings = res.data.ContentRatings || [];
      if (ratings.length === 0) {
          return [
              { Name: "G", Value: "G" },
              { Name: "PG", Value: "PG" },
              { Name: "PG-13", Value: "PG-13" },
              { Name: "R", Value: "R" },
              { Name: "NC-17", Value: "NC-17" }
          ];
      }
      return ratings.map((r: any) => ({ Name: r.Name, Value: r.Name }));
    } catch (error) {
        console.error("[EmbyProvider.getRatings] Error:", error);
        return [
            { Name: "G", Value: "G" },
            { Name: "PG", Value: "PG" },
            { Name: "PG-13", Value: "PG-13" },
            { Name: "R", Value: "R" },
            { Name: "NC-17", Value: "NC-17" }
        ];
    }
  }

  async getLibraries(auth?: AuthContext): Promise<MediaLibrary[]> {
    const res = await apiClient.get(getEmbyUrl(`/Users/${auth?.userId}/Views`, auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return (res.data.Items || [])
      .filter((l: any) => l.CollectionType === "movies")
      .map((l: any) => ({
        Id: l.Id,
        Name: l.Name,
        CollectionType: l.CollectionType,
      }));
  }

  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string, auth?: AuthContext): string {
    const path = type === "user" ? `/Users/${itemId}/Images/Primary` : `/Items/${itemId}/Images/${type}`;
    const baseUrl = getEmbyUrl(path, auth?.serverUrl);
    return tag ? `${baseUrl}?tag=${tag}` : baseUrl;
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");
    try {
        const imageUrl = this.getImageUrl(itemId, (type || "Primary") as any, undefined, auth) + "?maxWidth=20&quality=50";
        const headers = auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {};
        return await getBlurDataURL(itemId, imageUrl, headers) || "";
    } catch (e) {
        return "";
    }
  }

  async fetchImage(itemId: string, type: string, tag?: string, auth?: AuthContext, options?: Record<string, string>): Promise<ImageResponse> {
    const url = this.getImageUrl(itemId, type as any, tag, auth);
    const headers = auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {};
    const res = await apiClient.get(url, {
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
    const { authenticateEmby } = await import("@/lib/emby/api");
    return authenticateEmby(username, password || "", deviceId || "Swiparr", serverUrl);
  }

  async toggleWatchlist(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void> {
    const url = getEmbyUrl(`/Users/${auth?.userId}/Items/${itemId}/Rating`, auth?.serverUrl);
    await apiClient.post(url, null, { 
      params: { Likes: action === "add" },
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {}
    });
  }

  async toggleFavorite(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void> {
    const url = getEmbyUrl(`/Users/${auth?.userId}/FavoriteItems/${itemId}`, auth?.serverUrl);
    const headers = auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {};
    if (action === "add") {
      await apiClient.post(url, null, { headers });
    } else {
      await apiClient.delete(url, { headers });
    }
  }

  private getItemLanguage(item: any): string | undefined {
    const preferred = item.PreferredMetadataLanguage?.trim();
    if (preferred) {
      return preferred;
    }

    const streams = Array.isArray(item.MediaStreams) ? item.MediaStreams : [];
    const audioStreams = streams.filter((stream: { Type: any; }) => {
      const type = typeof stream?.Type === "string" ? stream.Type : "";
      return type.toLowerCase() === "audio";
    });

    const defaultAudio = audioStreams.find((stream: { IsDefault: any; Language: any; }) => stream?.IsDefault && stream?.Language);
    if (defaultAudio?.Language) {
      return defaultAudio.Language;
    }

    return audioStreams.find((stream: { Language: any; }) => stream?.Language)?.Language;
  }

  private mapToMediaItem(item: any): MediaItem {
    return {
      Id: item.Id,
      Name: item.Name,
      OriginalTitle: item.OriginalTitle,
      Language: this.getItemLanguage(item),
      RunTimeTicks: item.RunTimeTicks,
      ProductionYear: item.ProductionYear,
      CommunityRating: item.CommunityRating,
      Overview: item.Overview,
      Taglines: item.Taglines,
      OfficialRating: item.OfficialRating,
      Genres: item.Genres,
      People: item.People?.map((p: any) => ({
        Name: p.Name,
        Id: p.Id,
        Role: p.Role,
        Type: p.Type,
        PrimaryImageTag: p.PrimaryImageTag,
      })),
      ImageTags: item.ImageTags,
      BackdropImageTags: item.BackdropImageTags,
      UserData: item.UserData ? {
        IsFavorite: item.UserData.IsFavorite,
        Likes: item.UserData.Likes,
        Played: item.UserData.Played,
      } : undefined,
    };
  }
}
