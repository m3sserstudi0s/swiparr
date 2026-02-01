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
  };

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Items`), {
      params: {
        IncludeItemTypes: "Movie",
        Recursive: true,
        Fields: "Overview,RunTimeTicks,ProductionYear,CommunityRating,OfficialRating,Genres,ImageTags,BackdropImageTags,UserData",
        SortBy: filters.sortBy || "Id", // Deterministic starting point
        ParentId: filters.libraries?.join(",") || undefined,
        Genres: filters.genres?.join(",") || undefined,
        Years: filters.years?.join(",") || undefined,
        Filters: filters.unplayedOnly ? "IsUnplayed" : undefined,
        MinCommunityRating: filters.ratings?.[0] || undefined, 
        Limit: filters.limit || 50,
        StartIndex: filters.offset || 0,
      },
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });

    return (res.data.Items || []).map(this.mapToMediaItem);
  }

  async getItemDetails(id: string, auth?: AuthContext): Promise<MediaItem> {
    const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Items/${id}`), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return this.mapToMediaItem(res.data);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    const res = await apiClient.get(getJellyfinUrl("/Genres"), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return (res.data.Items || []).map((g: any) => ({ Id: g.Name, Name: g.Name }));
  }

  async getYears(auth?: AuthContext): Promise<MediaYear[]> {
    const res = await apiClient.get(getJellyfinUrl("/Years"), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Swiparr") : {},
    });
    return (res.data.Items || []).map((y: any) => ({ Name: y.Name, Value: parseInt(y.Name) }));
  }

  async getRatings(auth?: AuthContext): Promise<MediaRating[]> {
    return [
      { Name: "G", Value: "G" },
      { Name: "PG", Value: "PG" },
      { Name: "PG-13", Value: "PG-13" },
      { Name: "R", Value: "R" },
    ];
  }

  async getLibraries(auth?: AuthContext): Promise<MediaLibrary[]> {
    const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Views`), {
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

  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string): string {
    const path = type === "user" ? `/Users/${itemId}/Images/Primary` : `/Items/${itemId}/Images/${type}`;
    const baseUrl = getJellyfinUrl(path);
    return tag ? `${baseUrl}?tag=${tag}` : baseUrl;
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");
    return await getBlurDataURL(itemId, auth?.accessToken || "", auth?.deviceId || "Swiparr", type || "Primary") || "";
  }

  async authenticate(username: string, password?: string, deviceId?: string): Promise<any> {
    const { authenticateJellyfin } = await import("@/lib/jellyfin/api");
    return authenticateJellyfin(username, password || "", deviceId || "Swiparr");
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
