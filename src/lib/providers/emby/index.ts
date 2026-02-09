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
import { apiClient, getEmbyUrl, getAuthenticatedHeaders } from "@/lib/emby/api";
import { JellyfinQueryResultSchema, JellyfinItemSchema } from "../schemas";

/**
 * Emby Provider
 * Docs: https://dev.emby.media/reference/restapi/ItemService.html
 */
export class EmbyProvider implements MediaProvider {
  readonly name = "emby";
  
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
    const hasLanguageFilter = filters.languages && filters.languages.length > 0;
    
    const params: Record<string, any> = {
      IncludeItemTypes: "Movie",
      Recursive: true,
      Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres,ImageTags,BackdropImageTags,UserData,PreferredMetadataLanguage,ProductionLocations",
      SortBy: filters.sortBy === "Random" ? "Random" : 
              filters.sortBy === "Popular" ? "CommunityRating" :
              filters.sortBy === "Newest" ? "PremiereDate" :
              filters.sortBy === "Top Rated" ? "CommunityRating" :
              (filters.sortBy || "SortName"),
      SortOrder: (filters.sortBy === "Random" || filters.sortBy === "Popular" || filters.sortBy === "Newest" || filters.sortBy === "Top Rated") ? "Descending" : "Ascending",
      ParentId: filters.libraries?.join(",") || undefined,
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
    
    // Client-side language/country filtering for Emby
    if (hasLanguageFilter) {
      const selectedLangs = filters.languages!.map(l => l.toLowerCase());
      
      rawItems = rawItems.filter((item: any) => {
        // 1. Check PreferredMetadataLanguage
        const prefLang = item.PreferredMetadataLanguage?.toLowerCase();
        if (prefLang && selectedLangs.some(l => prefLang.includes(l))) {
          return true;
        }

        // 2. Fallback: Check ProductionLocations (Country filtering)
        const countryMap: Record<string, string[]> = {
          'en': ['usa', 'united states', 'united kingdom', 'uk', 'canada', 'australia'],
          'es': ['spain', 'mexico', 'argentina', 'colombia', 'peru', 'chile'],
          'fr': ['france', 'belgium', 'canada', 'switzerland'],
          'de': ['germany', 'austria', 'switzerland'],
          'it': ['italy'],
          'ja': ['japan'],
          'ko': ['korea', 'south korea'],
          'pt': ['portugal', 'brazil'],
          'zh': ['china', 'hong kong', 'taiwan'],
          'sv': ['sweden'],
          'da': ['denmark'],
          'no': ['norway'],
          'fi': ['finland'],
          'nl': ['netherlands', 'belgium'],
          'pl': ['poland'],
          'ru': ['russia'],
          'tr': ['turkey'],
          'hi': ['india'],
          'ar': ['egypt', 'saudi arabia', 'uae'],
        };

        const locations = (item.ProductionLocations || []).map((l: string) => l.toLowerCase());
        if (locations.length > 0) {
          return selectedLangs.some(langCode => {
            const countries = countryMap[langCode] || [];
            return countries.some(c => locations.some((loc: string) => loc.includes(c)));
          });
        }

        return false;
      });
    }
    
    return rawItems.map((item) => this.mapToMediaItem(item));
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
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

  private mapToMediaItem(item: any): MediaItem {
    return {
      Id: item.Id,
      Name: item.Name,
      OriginalTitle: item.OriginalTitle,
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
      } : undefined,
    };
  }
}
