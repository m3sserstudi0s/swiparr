import { config as appConfig } from "@/lib/config";
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
import { plexRequest, getPlexUrl, getPlexHeaders, getBestServerUrl } from "@/lib/plex/api";
import { getCachedYears, getCachedGenres, getCachedLibraries, getCachedRatings } from "@/lib/plex/cached-queries";
import { PlexContainerSchema } from "../schemas";
import { logger } from "@/lib/logger";
import { assertSafeUrl, getAllowedPlexImageHosts, isAllowedHost } from "@/lib/security/url-guard";
import { DEFAULT_THEMES } from "@/lib/constants";
import { plexSectionTypeForKind, plexTypeOf } from "./params";
import { mapPlexItem } from "./map";
import { matchesStartedFilter } from "@/lib/series-state";

/**
 * Plex Provider
 * Uses REST API. Plex uses complex query parameters for advanced filtering.
 * Filter pattern: ?genre=ID&contentRating=ID&year=YEAR&sort=random
 */
export class PlexProvider implements MediaProvider {
  readonly name = ProviderType.PLEX;
  
  readonly capabilities: ProviderCapabilities = PROVIDER_CAPABILITIES[ProviderType.PLEX];

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    const headers = getPlexHeaders(token);
    
    let allItems: any[] = [];
    const sections = await this.getLibraries(auth);

    // `kinds` is derived from the deck mode; a movie-only deck must not see show
    // sections, and a `mixed` deck needs both, so filter sections by kind first.
    const kinds = filters.kinds && filters.kinds.length > 0 ? filters.kinds : (["movie"] as const);
    const wantedCollections = new Set<string>(
      kinds.map((kind) => plexSectionTypeForKind(kind) === "show" ? "tvshows" : "movies")
    );

    const targetSections = filters.libraries && filters.libraries.length > 0 
      ? sections.filter(s => filters.libraries?.includes(s.Id))
      : sections.filter(s => wantedCollections.has(s.CollectionType ?? "movies"));

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
        const sectionIsShows = section.CollectionType === "tvshows";
        const params: Record<string, any> = {
            type: plexTypeOf(sectionIsShows ? "series" : "movie"),
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
        if (filters.excludedGenres && filters.excludedGenres.length > 0) {
            logger.debug("[PlexProvider.getItems] Excluded genres will be applied client-side", {
                excludedGenres: filters.excludedGenres,
            });
        }

        if (filters.excludedThemes && filters.excludedThemes.length > 0) {
            logger.debug("[PlexProvider.getItems] Excluded themes will be applied client-side", {
                excludedThemes: filters.excludedThemes,
            });
        }

        if (filters.excludedRatings && filters.excludedRatings.length > 0) {
            logger.debug("[PlexProvider.getItems] Excluded ratings will be applied client-side", {
                excludedRatings: filters.excludedRatings,
            });
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
        const res = await plexRequest<any>({ method: 'get', url, headers, params });
        const data = PlexContainerSchema.parse(res.data);
        const items = data.MediaContainer.Metadata || [];
        allItems = [...allItems, ...items];
    }

    const mapped = allItems.slice(0, filters.limit || 20).map(item => this.mapToMediaItem(item));

    // Plex has no "started" concept of its own; the shared helper reads view state
    // from the mapped item so shows behave like they do on Jellyfin.
    if (filters.started && filters.started !== "any") {
      return mapped.filter((item) => matchesStartedFilter(item, filters.started!));
    }
    return mapped;
  }

  async getItemDetails(id: string, auth?: AuthContext, options?: { includeUserState?: boolean }): Promise<MediaItem> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    if (!token) throw new Error("Plex Token is required");
    const includeUserState = options?.includeUserState ?? false;
    const path = id.includes("/") ? id : `/library/metadata/${id}`;
    const url = getPlexUrl(path, auth?.serverUrl);
    const res = await plexRequest<any>({
      method: 'get',
      url,
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

  /**
   * Seasons of a show, or the episodes of one season.
   *
   * Plex splits these across two hops: `/library/metadata/{show}/children`
   * returns seasons, and a season's own children are its episodes. There is no
   * "all episodes of show" endpoint that keeps numbering, so an episode request
   * without a season number walks the first season only — the caller is expected
   * to pass `season` when it knows it.
   */
  async getChildren(
    seriesId: string,
    kind: "season" | "episode",
    auth?: AuthContext,
    options?: { season?: number }
  ): Promise<MediaItem[]> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    if (!token) throw new Error("Plex Token is required");
    const headers = getPlexHeaders(token);

    const fetchChildren = async (id: string): Promise<any[]> => {
      const url = getPlexUrl(`/library/metadata/${id}/children`, auth?.serverUrl);
      const res = await plexRequest<any>({ method: 'get', url, headers });
      const data = PlexContainerSchema.parse(res.data);
      const container = data.MediaContainer;
      // Plex puts real children in Metadata and adds shortcut nodes to Directory
      // ("All episodes", which has no ratingKey), so both arrays are read and the
      // keyless nodes dropped rather than trusting either array alone.
      const children = [
        ...(container.Metadata || []),
        ...(container.Directory || []),
        ...(container.Video || []),
      ];
      return children.filter((child) => Boolean(child.ratingKey));
    };

    const seasons = await fetchChildren(seriesId);
    if (kind === "season") return seasons.map((item) => this.mapToMediaItem(item));

    const season = typeof options?.season === "number"
      ? seasons.find((s) => s.index === options.season)
      : seasons[0];
    if (!season?.ratingKey) return [];

    const episodes = await fetchChildren(String(season.ratingKey));
    return episodes.map((item) => this.mapToMediaItem(item));
  }

  /** Continue-watching across the whole server — Plex's own onDeck shelf. */
  async getNextUp(auth?: AuthContext, limit = 24): Promise<MediaItem[]> {
    const token = auth?.accessToken || appConfig.PLEX_TOKEN;
    if (!token) throw new Error("Plex Token is required");
    const url = getPlexUrl("/library/onDeck", auth?.serverUrl);
    const res = await plexRequest<any>({
      method: 'get',
      url,
      headers: getPlexHeaders(token),
      params: { 'X-Plex-Container-Start': 0, 'X-Plex-Container-Size': limit },
    });
    const data = PlexContainerSchema.parse(res.data);
    return (data.MediaContainer.Metadata || []).map((item) => this.mapToMediaItem(item));
  }

  async getGenres(auth?: AuthContext): Promise<MediaGenre[]> {
    if (!auth?.accessToken || !auth?.deviceId || !auth?.userId) {
      throw new Error("Auth credentials required");
    }
    const genres = await getCachedGenres(auth.accessToken, auth.deviceId, auth.userId, auth.serverUrl);
    return Array.from(genres);
  }

  async getThemes(auth?: AuthContext): Promise<string[]> {

    return DEFAULT_THEMES;

    /*
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
            const res = await plexRequest({ method: 'get', url, headers });
            const data = res.data.MediaContainer?.Directory || [];
            data.forEach((d: any) => allLabels.add(d.title));
            if (allLabels.size >= 15) break;
        }
        
        return Array.from(allLabels).slice(0, 15);
    } catch (e) {
        return [];
    }
    */
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
    // Plex tags sections "movie" | "show" | "artist" | "photo"; our library list
    // needs the browseable ones, with the CollectionType the rest of the app uses.
    return libraryItems
      .filter((l: any) => l.type === "movie" || l.type === "show")
      .map((l: any) => ({
        Id: l.key,
        Name: l.title,
        // The app's vocabulary is "movies" / "tvshows" (as Jellyfin returns), not
        // Plex's "show" — media-service filters libraries by that value.
        CollectionType: l.type === "show" ? "tvshows" : "movies",
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
        const res = await plexRequest<any>({
          method: 'get',
          url,
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
    const res = await plexRequest<any>({
      method: 'get',
      url,
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
    const res = await plexRequest<any>({ method: 'get', url, headers });
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
    return mapPlexItem(item);
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
        await plexRequest<any>({
          method: 'put',
          url: `${base}${endpoint}`,
          data: null,
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
            const res = await plexRequest<any>({
              method: 'get',
              url: `${base}/library/metadata/${ratingKey}/userState`,
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
