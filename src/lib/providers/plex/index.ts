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
import { logger } from "@/lib/logger";
import { assertSafeUrl, getAllowedPlexImageHosts, isAllowedHost } from "@/lib/security/url-guard";

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
            includeUserState: 1,
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
            params.genre = resolvedGenres.map((g) => g.replace(/^\//, '')).join(',');
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

  async getItemDetails(id: string, auth?: AuthContext, options?: { includeUserState?: boolean }): Promise<MediaItem> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    if (!token) throw new Error("Plex Token is required");
    const includeUserState = options?.includeUserState ?? false;
    const path = id.includes("/") ? id : `/library/metadata/${id}`;
    const url = getPlexUrl(path, auth?.serverUrl);
    const res = await plexClient.get(url, {
      headers: getPlexHeaders(token),
      params: {
        includeGuids: 1,
        includeCollections: 1,
        includeMeta: 1,
        ...(includeUserState ? { includeUserState: 1 } : {}),
      },
    });
    const data = PlexContainerSchema.parse(res.data);
    const item = data.MediaContainer.Metadata?.[0];
    if (!item) throw new Error("Item not found");
    if (includeUserState) {
      await this.attachWatchlistState(item, token);
    }
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
    if (path.startsWith('http://') || path.startsWith('https://')) {
        const parsed = assertSafeUrl(path, {
          source: "user",
          allowlist: getAllowedPlexImageHosts(),
        });
        const allowedHosts = getAllowedPlexImageHosts();
        if (!isAllowedHost(parsed.hostname, allowedHosts)) {
          throw new Error("External image host not allowed");
        }
        return parsed.toString();
    }
    if (path.startsWith('/')) {
        return getPlexUrl(`${path}?X-Plex-Token=${token}`, auth?.serverUrl);
    }
    if (itemId && !tag) {
        return getPlexUrl(`/library/metadata/${itemId}/thumb?X-Plex-Token=${token}`, auth?.serverUrl);
    }
    return "";
  }

  async getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string> {
    const { getBlurDataURL } = await import("@/lib/server/image-blur");
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    try {
        const path = itemId.includes("/") ? itemId : `/library/metadata/${itemId}`;
        const url = getPlexUrl(path, auth?.serverUrl);
        const res = await plexClient.get(url, {
          headers: getPlexHeaders(token),
          params: {
            includeMeta: 1,
          },
        });
        const data = PlexContainerSchema.parse(res.data);
        const item = data.MediaContainer.Metadata?.[0];
        const tag = type === "Backdrop" ? item?.art : item?.thumb;
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
    if (!url) {
        throw new Error("Invalid URL");
    }
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const headers = url.startsWith('http') ? {} : getPlexHeaders(token);
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

    const watchlistGuid = item.guid || (item.Guid?.[0]?.id ?? undefined);
    const isWatchlisted = (item.userState?.watchlistedAt ?? 0) > 0;
    const isPlayed = (item.viewCount ?? 0) > 0 || (item.viewOffset ?? 0) > 0 || (item.lastViewedAt ?? 0) > 0;

    const ratingImage = item.ratingImage || item.audienceRatingImage;
    const ratingSource = typeof ratingImage === "string" ? ratingImage.toLowerCase() : "";
    const hasImdbRating = ratingSource.includes("imdb");
    const communityRating = hasImdbRating
      ? item.rating
      : (item.audienceRating ?? item.rating);


    return {
      Id: item.ratingKey,
      Guid: watchlistGuid,
      Name: item.title,
      OriginalTitle: item.originalTitle,
      Language: language,
      RunTimeTicks: item.duration ? item.duration * 10000 : undefined, 
      ProductionYear: item.year,
      CommunityRating: communityRating,
      CommunityRatingSource: ratingImage,
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
      UserData: item.userRating !== undefined || isWatchlisted || isPlayed
        ? {
            IsFavorite: item.userRating > 0,
            Likes: isWatchlisted,
            Played: isPlayed,
          }
        : undefined,
    };
  }

  private async resolveGenreIds(genres: string[], auth?: AuthContext): Promise<string[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) return genres;
    try {
      const cached = await getCachedGenres(auth.accessToken, auth.deviceId, auth.userId, auth.serverUrl);
      const byName = new Map(cached.map((g: any) => [g.Name.toLowerCase(), g.Id]));
      const byId = new Set(cached.map((g: any) => g.Id));
      return genres.map((g) => {
          const normalized = g.toLowerCase();
          const resolved = byName.get(normalized) || g;
          return byId.has(resolved) ? resolved : g;
      });
    } catch (e) {
      return genres;
    }
  }

  async toggleWatchlist(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    if (!token) throw new Error("Plex Token is required");

    let ratingKey = itemId;

    try {
        const details = await this.getItemDetails(itemId, auth, { includeUserState: false });
      if (details.Guid) {
        const guidParts = details.Guid.split("/");
        ratingKey = guidParts[guidParts.length - 1] || itemId;
      }
    } catch (error) {
      logger.warn("[PlexProvider.toggleWatchlist] Failed to resolve watchlist ratingKey", error);
    }

    const endpoint = action === "add" ? "/actions/addToWatchlist" : "/actions/removeFromWatchlist";
    const watchlistBases = [
      "https://discover.provider.plex.tv",
      "https://metadata.provider.plex.tv",
    ];

    let lastError: unknown;

    for (const base of watchlistBases) {
      try {
        await plexClient.put(`${base}${endpoint}`, null, {
          headers: {
            ...getPlexHeaders(token),
          },
          params: {
            ratingKey,
            "X-Plex-Token": token,
          },
        });
        return;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        if (status === 404) continue;
        logger.error("[PlexProvider.toggleWatchlist] Failed to update watchlist", error);
        throw error;
      }
    }

    logger.error("[PlexProvider.toggleWatchlist] Failed to update watchlist", lastError);
    throw lastError;
  }

  private async attachWatchlistState(item: any, token: string): Promise<void> {
    const watchlistGuid = item.guid || (item.Guid?.[0]?.id ?? undefined);
    if (!watchlistGuid) return;

    const guidParts = watchlistGuid.split("/");
    const ratingKey = guidParts[guidParts.length - 1];
    if (!ratingKey) return;

        const userStateBases = [
          "https://discover.provider.plex.tv",
          "https://metadata.provider.plex.tv",
        ];

        for (const base of userStateBases) {
          try {
            const res = await plexClient.get(`${base}/library/metadata/${ratingKey}/userState`, {
              headers: getPlexHeaders(token),
              params: {
                "X-Plex-Token": token,
              },
            });

            const userState = res.data?.MediaContainer?.UserState?.[0];
            if (userState) {
          item.userState = userState;
        }
        return;
          } catch (error: any) {
            const status = error?.response?.status;
            if (status === 404) continue;
            logger.warn("[PlexProvider.attachWatchlistState] Failed to fetch watchlist state", error);
            return;
          }
        }
  }
}
