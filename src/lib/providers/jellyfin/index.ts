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
import { apiClient, getJellyfinUrl, getAuthenticatedHeaders } from "@/lib/jellyfin/api";

export class JellyfinProvider implements MediaProvider {
  readonly name = "jellyfin";
  
  readonly capabilities: ProviderCapabilities = {
    hasAuth: true,
    hasQuickConnect: true,
    hasWatchlist: true,
    hasLibraries: true,
    hasSettings: true,
    requiresServerUrl: true,
    isExperimental: false,
    hasStreamingSettings: true,
    isAdminPanel: true
  };

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Items`, auth?.serverUrl), {
      params: {
        IncludeItemTypes: "Movie",
        Recursive: true,
        Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres,ImageTags,BackdropImageTags,UserData",
        SortBy: filters.sortBy || "Id", 
        ParentId: filters.libraries?.join(",") || undefined,
        GenreNames: filters.genres?.join(",") || undefined,
        Years: filters.years?.join(",") || undefined,
        OfficialRatings: filters.ratings?.join(",") || undefined,
        Filters: filters.unplayedOnly ? "IsUnplayed" : undefined,
        MinCommunityRating: filters.minCommunityRating || undefined, 
        Limit: filters.limit || 50,
        StartIndex: filters.offset || 0,
      },
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });

    return (res.data.Items || []).map((item: any) => this.mapToMediaItem(item));
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
    const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Items/${id}`, auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return this.mapToMediaItem(res.data);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    const res = await apiClient.get(getJellyfinUrl("/Genres", auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return (res.data.Items || []).map((g: any) => ({ Id: g.Name, Name: g.Name }));
  }

  async getYears(auth?: AuthContext): Promise<MediaYear[]> {
    const res = await apiClient.get(getJellyfinUrl("/Years", auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return (res.data.Items || []).map((y: any) => ({ Name: y.Name, Value: parseInt(y.Name) }));
  }

   async getRatings(auth?: AuthContext): Promise<MediaRating[]> {
    const res = await apiClient.get(getJellyfinUrl("/Items", auth?.serverUrl), {
      params: {
        IncludeItemTypes: "Movie",
        Recursive: true,
        Fields: "OfficialRating",
        EnableImages: false,
        UserId: auth?.userId,
      },
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });

    const items = res.data.Items || [];
    const ratings = Array.from(new Set(items.map((i: any) => i.OfficialRating).filter(Boolean))) as string[];
    
    return ratings.sort().map(r => ({ Name: r, Value: r }));
  }

  async getLibraries(auth?: AuthContext): Promise<MediaLibrary[]> {
    const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Views`, auth?.serverUrl), {
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
    const baseUrl = getJellyfinUrl(path, auth?.serverUrl);
    return tag ? `${baseUrl}?tag=${tag}` : baseUrl;
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");
    const { getAuthenticatedHeaders } = await import("@/lib/jellyfin/api");
    try {
        const imageUrl = this.getImageUrl(itemId, (type || "Primary") as any) + "?maxWidth=20&quality=50";
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
    const { authenticateJellyfin } = await import("@/lib/jellyfin/api");
    return authenticateJellyfin(username, password || "", deviceId || "Swiparr", serverUrl);
  }

  async toggleWatchlist(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void> {
    const url = getJellyfinUrl(`/Users/${auth?.userId}/Items/${itemId}/Rating`, auth?.serverUrl);
    await apiClient.post(
      url,
      null,
      { 
          params: { Likes: action === "add" },
          headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {}
      }
    );
  }

  async toggleFavorite(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void> {
    const url = getJellyfinUrl(`/Users/${auth?.userId}/FavoriteItems/${itemId}`, auth?.serverUrl);
    const headers = auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {};
    if (action === "add") {
      await apiClient.post(url, null, { headers });
    } else {
      await apiClient.delete(url, { headers });
    }
  }

  async initiateQuickConnect(deviceId: string, serverUrl?: string): Promise<any> {
    const { initiateQuickConnect } = await import("@/lib/jellyfin/api");
    return initiateQuickConnect(deviceId, serverUrl);
  }

  async checkQuickConnect(secret: string, deviceId: string, serverUrl?: string): Promise<any> {
    const { checkQuickConnect } = await import("@/lib/jellyfin/api");
    return checkQuickConnect(secret, deviceId, serverUrl);
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
      Studios: item.Studios?.map((s: any) => ({
        Name: s.Name,
        Id: s.Id,
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
