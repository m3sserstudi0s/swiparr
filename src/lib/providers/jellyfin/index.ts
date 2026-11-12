import {
  MediaProvider,
  ProviderCapabilities,
  SearchFilters,
  AuthContext,
  ImageResponse,
  ProviderType,
  PROVIDER_CAPABILITIES
} from "../types";

import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating 
} from "@/types/media";
import { apiClient, getJellyfinUrl, getAuthenticatedHeaders } from "@/lib/jellyfin/api";
import { getCachedYears, getCachedGenres, getCachedLibraries, getCachedRatings } from "@/lib/jellyfin/cached-queries";
import { JellyfinQueryResultSchema, JellyfinItemSchema } from "../schemas";
import { logger } from "@/lib/logger";
import { DEFAULT_THEMES } from "@/lib/constants";
import { mapJellyfinItem } from "./map";
import { JELLYFIN_ITEM_FIELDS, toIncludeItemTypes } from "./params";
import { interleaveByKind, splitPaging } from "./interleave";
import { matchesStartedFilter } from "@/lib/series-state";

/**
 * Jellyfin Provider
 * Docs: https://api.jellyfin.org/
 */
export class JellyfinProvider implements MediaProvider {
  readonly name = ProviderType.JELLYFIN;
  
  readonly capabilities: ProviderCapabilities = PROVIDER_CAPABILITIES[ProviderType.JELLYFIN];

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    // If multiple libraries are selected, we need to fetch from each one and merge
    // Jellyfin's ParentId only supports a single ID
    if (filters.libraries && filters.libraries.length > 1) {
      const allResults = await Promise.all(
        filters.libraries.map(libId => 
          this.getItems({ ...filters, libraries: [libId] }, auth)
        )
      );
      
      // Merge results
      const merged = allResults.flat();
      
      // If we have a sort order, we should ideally sort here, but for now 
      // we'll just return the merged list and let the service handle it if needed.
      // Most providers sort on the server. Merging pre-sorted lists is complex for pagination.
      
      // Deduplicate by ID just in case
      const seen = new Set();
      const unique = merged.filter(item => {
        if (seen.has(item.Id)) return false;
        seen.add(item.Id);
        return true;
      });

      return unique.slice(0, filters.limit || 20);
    }

    const includeItemTypes = toIncludeItemTypes(filters.kinds);
    const typeList = includeItemTypes.split(",").filter(Boolean);
    const params: Record<string, any> = {
      // Kinds drive the item type: movies by default, `Movie,Series` for mixed.
      IncludeItemTypes: includeItemTypes,
      Recursive: true,
      Fields: JELLYFIN_ITEM_FIELDS,
      SortBy: filters.sortBy === "Random" ? "Random" : 
              filters.sortBy === "Trending" ? "CommunityRating" :
              filters.sortBy === "Popular" ? "CommunityRating" :
              filters.sortBy === "Newest" ? "PremiereDate" :
              filters.sortBy === "Top Rated" ? "CommunityRating" :
              (filters.sortBy || "SortName"),
      SortOrder: (filters.sortBy === "Random" || filters.sortBy === "Popular" || filters.sortBy === "Newest" || filters.sortBy === "Top Rated") ? "Descending" : "Ascending",
      ParentId: filters.libraries?.[0] || undefined,
      Genres: filters.genres?.join("|") || undefined, // Jellyfin uses pipe for multiple genres
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
      HasOverview: true,
    };

    if (filters.searchTerm) {
      params.SearchTerm = filters.searchTerm;
    }

    const fetchPage = async (pageParams: Record<string, any>) => {
      const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Items`, auth?.serverUrl), {
        params: pageParams,
        headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {},
      });
      const data = JellyfinQueryResultSchema.parse(res.data);
      return data.Items.map((item) => mapJellyfinItem(item));
    };

    // Jellyfin buckets a mixed `Movie,Series` query by type before paging, so a
    // 20-row page of a film-heavy library is 20 films and a mixed deck never shows
    // a show. Ask once per type and interleave; the page is then genuinely mixed.
    let items: MediaItem[];
    if (typeList.length > 1) {
      const pageSize = filters.limit || 20;
      const paging = splitPaging(pageSize, filters.offset || 0, typeList.length);
      const pages = await Promise.all(
        typeList.map((type) =>
          fetchPage({ ...params, IncludeItemTypes: type, Limit: paging.limit, StartIndex: paging.offset })
        )
      );
      items = interleaveByKind(pages, pageSize);
    } else {
      items = await fetchPage(params);
    }

    // Jellyfin has no server-side "series not started" filter, so the series
    // modes filter on the counts it returns. Movies always pass.
    if (filters.started && filters.started !== "any") {
      return items.filter((item) => matchesStartedFilter(item, filters.started!));
    }
    return items;
  }

  /**
   * Seasons or episodes of one series, in air order.
   * Jellyfin splits these across /Shows/{id}/Seasons and /Shows/{id}/Episodes.
   */
  async getChildren(
    seriesId: string,
    kind: "season" | "episode",
    auth?: AuthContext,
    options?: { season?: number }
  ): Promise<MediaItem[]> {
    if (!auth?.userId) throw new Error("Auth credentials required");

    const path = kind === "season"
      ? `/Shows/${seriesId}/Seasons`
      : `/Shows/${seriesId}/Episodes`;

    const params: Record<string, any> = {
      userId: auth.userId,
      Fields: JELLYFIN_ITEM_FIELDS,
    };
    // Undefined means "every season"; 0 is a real season number.
    if (kind === "episode" && typeof options?.season === "number") {
      params.season = options.season;
    }

    const res = await apiClient.get(getJellyfinUrl(path, auth.serverUrl), {
      params,
      headers: auth.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {},
    });

    const data = JellyfinQueryResultSchema.parse(res.data);
    return data.Items.map((item) => mapJellyfinItem(item));
  }

  /** Next unwatched episode per series — the Continue deck. */
  async getNextUp(auth?: AuthContext, limit = 24): Promise<MediaItem[]> {
    if (!auth?.userId) throw new Error("Auth credentials required");

    const res = await apiClient.get(getJellyfinUrl("/Shows/NextUp", auth.serverUrl), {
      params: {
        userId: auth.userId,
        Limit: limit,
        Fields: JELLYFIN_ITEM_FIELDS,
      },
      headers: auth.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {},
    });

    const data = JellyfinQueryResultSchema.parse(res.data);
    return data.Items.map((item) => mapJellyfinItem(item));
  }

  async getItemDetails(id: string, auth?: AuthContext, _options?: { includeUserState?: boolean }): Promise<MediaItem> {
    const res = await apiClient.get(getJellyfinUrl(`/Users/${auth?.userId}/Items/${id}`, auth?.serverUrl), {
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {},
    });
    const data = JellyfinItemSchema.parse(res.data);
    return mapJellyfinItem(data);
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const items = await getCachedGenres(auth.accessToken, auth.deviceId, auth.userId);
    return items.map((g: any) => ({ Id: g.Name, Name: g.Name }));
  }

  async getThemes(auth?: AuthContext): Promise<string[]> {
    logger.debug("[JellyfinProvider.getThemes] Starting with auth:", { userId: auth?.userId, serverUrl: auth?.serverUrl });
    
    return DEFAULT_THEMES;

    /* 
    try {
      // Use /Items/Filters2 to get all available tags for movies
      // This is the correct Jellyfin API endpoint for getting filter values
      const url = getJellyfinUrl("/Items/Filters2", auth?.serverUrl);
      logger.debug("[JellyfinProvider.getThemes] Fetching from URL:", url);
      
      const res = await apiClient.get(url, {
        params: {
          userId: auth?.userId,
          includeItemTypes: "Movie",
          recursive: true,
        },
        headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {},
      });

      logger.debug("[JellyfinProvider.getThemes] Response data:", res.data);
      logger.debug("[JellyfinProvider.getThemes] Tags from response:", res.data?.Tags);
      
      const tags = res.data.Tags || [];
      
      // If no tags exist in the library, fall back to static themes
      if (tags.length === 0) {
        logger.debug("[JellyfinProvider.getThemes] No tags found in library, using fallback themes");
        return ["Christmas", "Halloween", "Zombie", "Superhero", "Time Travel", "Aliens", "Dystopia", "Cyberpunk", "Space", "Based on Video Game"];
      }
      
      const result = tags.slice(0, 15);
      logger.debug("[JellyfinProvider.getThemes] Returning tags:", result);
      return result;
    } catch (error) {
      logger.error("[JellyfinProvider.getThemes] Error fetching themes:", error);
      // Return fallback themes on error
      return ["Christmas", "Halloween", "Zombie", "Superhero", "Time Travel", "Aliens", "Dystopia", "Cyberpunk", "Space", "Based on Video Game"];
    }
      */
  }

  async getYears(auth?: AuthContext): Promise<MediaYear[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const items = await getCachedYears(auth.accessToken, auth.deviceId, auth.userId);
    return items.map((y: any) => ({ Name: y.Name, Value: parseInt(y.Name) }));
  }

  async getRatings(auth?: AuthContext): Promise<MediaRating[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    try {
      const ratings = await getCachedRatings(auth.accessToken, auth.deviceId, auth.userId);
      if (ratings.length === 0) {
        return [
          { Name: "G", Value: "G" },
          { Name: "PG", Value: "PG" },
          { Name: "PG-13", Value: "PG-13" },
          { Name: "R", Value: "R" },
          { Name: "NC-17", Value: "NC-17" }
        ];
      }
      return ratings.map((r: any) => ({ Name: r, Value: r }));
    } catch (error) {
      logger.error("[JellyfinProvider.getRatings] Error:", error);
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
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const items = await getCachedLibraries(auth.accessToken, auth.deviceId, auth.userId);
    return items.map((l: any) => ({
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
    try {
        const imageUrl = this.getImageUrl(itemId, (type || "Primary") as any, undefined, auth) + "?maxWidth=20&quality=50";
        const headers = auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {};
        return await getBlurDataURL(itemId, imageUrl, headers) || "";
    } catch (e) {
        return "";
    }
  }

  async fetchImage(itemId: string, type: string, tag?: string, auth?: AuthContext, options?: Record<string, string>): Promise<ImageResponse> {
    const url = this.getImageUrl(itemId, type as any, tag, auth);
    const headers = auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {};
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
    return authenticateJellyfin(username, password || "", deviceId || "Messer Swipe", serverUrl);
  }

  async toggleWatchlist(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void> {
    const url = getJellyfinUrl(`/Users/${auth?.userId}/Items/${itemId}/Rating`, auth?.serverUrl);
    await apiClient.post(url, null, { 
      params: { Likes: action === "add" },
      headers: auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {}
    });
  }

  async toggleFavorite(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void> {
    const url = getJellyfinUrl(`/Users/${auth?.userId}/FavoriteItems/${itemId}`, auth?.serverUrl);
    const headers = auth?.accessToken ? getAuthenticatedHeaders(auth.accessToken, auth.deviceId || "Messer Swipe") : {};
    if (action === "add") {
      await apiClient.post(url, null, { headers });
    } else {
      await apiClient.delete(url, { headers });
    }
  }

}
