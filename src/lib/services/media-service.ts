import { eq, and, isNull } from "drizzle-orm";
import { db, likes, hiddens, sessions, sessionMembers } from "@/lib/db";
import { SessionData, Filters } from "@/types";
import { MediaItem } from "@/types/media";
import { shuffleWithSeed } from "@/lib/utils";
import { getMediaProvider } from "@/lib/providers/factory";
import { ProviderType } from "@/lib/providers/types";
import { AuthService } from "./auth-service";
import { ConfigService } from "./config-service";
import { deckCache } from "./deck-cache";
import { logger } from "@/lib/logger";

export class MediaService {
  static async getMediaItems(session: SessionData, page: number, limit: number, searchTerm?: string, overrideFilters?: Filters) {
    logger.debug(`getMediaItems: page=${page}, limit=${limit}, searchTerm=${searchTerm}`, { overrideFilters });
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    const activeProviderName = auth.provider || session.user.provider || ProviderType.JELLYFIN;

    const includedLibraries = await ConfigService.getIncludedLibraries();

    // 1. Get existing interactions to exclude
    const [liked, hidden] = await Promise.all([
      db.select({ externalId: likes.externalId })
        .from(likes)
        .where(and(
          eq(likes.externalUserId, session.user.Id),
          session.sessionCode ? eq(likes.sessionCode, session.sessionCode) : isNull(likes.sessionCode)
        )),
      db.select({ externalId: hiddens.externalId })
        .from(hiddens)
        .where(
          session.sessionCode 
            ? and(eq(hiddens.externalUserId, session.user.Id), eq(hiddens.sessionCode, session.sessionCode))
            : and(eq(hiddens.externalUserId, session.user.Id), isNull(hiddens.sessionCode))
        )
    ]);

    const excludeIds = new Set([
      ...liked.map((l: any) => l.externalId),
      ...hidden.map((h: any) => h.externalId)
    ]);

    // Calculate effective offset to handle item shifting due to swipes
    // Total swiped items (liked + hidden) for the current mode
    const totalSwipedCount = excludeIds.size;
    const effectiveOffset = (page * limit) + totalSwipedCount;

    // 2. Get Filters
    let sessionFilters: Filters | null = overrideFilters || null;

    if (!sessionFilters) {
      sessionFilters = session.sessionCode 
        ? await (async () => {
            const currentSession = await db.select().from(sessions).where(eq(sessions.code, session.sessionCode!)).then((rows: any[]) => rows[0]);
            return currentSession?.filters ? JSON.parse(currentSession.filters) : null;
          })()
        : session.soloFilters;
    }

    const { watchProviders, watchRegion } = await this.resolveWatchProviders(session, sessionFilters, auth, activeProviderName);
    const defaultSort = activeProviderName === 'tmdb' ? "Popular" : "Trending";

    // 3. Handle Search
    if (searchTerm) {
      const results = await provider.getItems({ 
        searchTerm, 
        libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
        watchProviders,
        watchRegion,
        limit: 20 
      }, auth);
      return { items: results, hasMore: false };
    }

    // 4. Handle Session vs Solo Mode
    if (session.sessionCode) {
      return this.getSessionItems(session.sessionCode, sessionFilters, auth, provider, excludeIds, includedLibraries, watchProviders, watchRegion, page, limit, effectiveOffset);
    } else {
      return this.getSoloItems(sessionFilters, auth, provider, excludeIds, includedLibraries, watchProviders, watchRegion, page, limit, effectiveOffset);
    }
  }

  private static async resolveWatchProviders(session: SessionData, sessionFilters: Filters | null, auth: any, activeProviderName: string) {
    let watchProviders = sessionFilters?.watchProviders;
    let watchRegion = sessionFilters?.watchRegion || auth.watchRegion || "SE";

    if (session.sessionCode && activeProviderName === "tmdb") {
      const accumulated = new Set<string>();
      const sessionMembersList = await db.query.sessionMembers.findMany({
        where: eq(sessionMembers.sessionCode, session.sessionCode)
      });
      
      // Use the host's region as the default for the session if not explicitly set in filters
      const hostMember = sessionMembersList.find((m: any) => m.externalUserId === session.user.Id); // This might not be the host, but the current user
      // Actually, sessions table has hostUserId.
      const currentSession = await db.query.sessions.findFirst({ where: eq(sessions.code, session.sessionCode) });
      const hostId = currentSession?.hostUserId;
      
      sessionMembersList.forEach((m: any) => {
        if (m.settings) {
          try {
            const s = JSON.parse(m.settings);
            if (s.watchProviders) s.watchProviders.forEach((p: string) => accumulated.add(p));
            // Only take region from host to be deterministic, or keep current if host not found
            if (m.externalUserId === hostId && !sessionFilters?.watchRegion) {
                watchRegion = s.watchRegion || watchRegion;
            }
          } catch(e) {}
        }
      });

      if (!watchProviders) {
        watchProviders = accumulated.size > 0 ? Array.from(accumulated) : undefined;
      }
    } else if (!watchProviders && !session.sessionCode) {
      const settings = await ConfigService.getUserSettings(session.user.Id);
      if (settings) {
        if (settings.watchProviders) watchProviders = settings.watchProviders;
        if (settings.watchRegion) watchRegion = settings.watchRegion;
      }
    }
    
    return { watchProviders, watchRegion };
  }

  private static async getSessionItems(sessionCode: string, sessionFilters: Filters | null, auth: any, provider: any, excludeIds: Set<string>, includedLibraries: string[], watchProviders: string[] | undefined, watchRegion: string, page: number, limit: number, effectiveOffset: number) {
    const sortBy = sessionFilters?.sortBy || (auth.provider === 'tmdb' ? "Popular" : "Trending");

    // Handle deterministic Random sort for group sessions
    if (sortBy === "Random") {
      return this.getDeterministicRandomItems(
        sessionCode,
        sessionFilters,
        auth,
        provider,
        excludeIds,
        includedLibraries,
        watchProviders,
        watchRegion,
        page,
        limit
      );
    }

    const fetchedItems = await provider.getItems({
      libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
      genres: sessionFilters?.genres,
      years: (sessionFilters?.yearRange && sessionFilters.yearRange[0] !== undefined && sessionFilters.yearRange[1] !== undefined) ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange![0] + i) : undefined,
      ratings: sessionFilters?.officialRatings,
      minCommunityRating: sessionFilters?.minCommunityRating,
      runtimeRange: sessionFilters?.runtimeRange,
      watchProviders,
      watchRegion,
      sortBy,
      themes: sessionFilters?.themes,
      tmdbLanguages: sessionFilters?.tmdbLanguages,
      unplayedOnly: sessionFilters?.unplayedOnly,
      limit: limit * 2, // Fetch a bit more to account for exclusions
      offset: effectiveOffset,
    }, auth);

    let items = this.applyClientFilters(fetchedItems, sessionFilters);
    items = items.filter(item => !excludeIds.has(item.Id));
    
    const slicedItems = items.slice(0, limit);

    if (slicedItems.length > 0) {
      slicedItems[0].BlurDataURL = await provider.getBlurDataUrl(slicedItems[0].Id, "Primary", auth);
    }

    return {
      items: slicedItems,
      hasMore: fetchedItems.length >= (auth.provider === 'tmdb' ? 20 : limit * 2)
    };
  }

  private static async getDeterministicRandomItems(
    sessionCode: string,
    sessionFilters: Filters | null,
    auth: any,
    provider: any,
    excludeIds: Set<string>,
    includedLibraries: string[],
    watchProviders: string[] | undefined,
    watchRegion: string,
    page: number,
    limit: number
  ): Promise<{ items: MediaItem[]; hasMore: boolean }> {
    // Get session for random seed
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.code, sessionCode)
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Use session's random seed, fallback to code if not present (backwards compatibility)
    const randomSeed = session.randomSeed || sessionCode;

    // Build filter object for cache key
    const filterKey = {
      libraries: includedLibraries,
      genres: sessionFilters?.genres,
      yearRange: sessionFilters?.yearRange,
      officialRatings: sessionFilters?.officialRatings,
      minCommunityRating: sessionFilters?.minCommunityRating,
      runtimeRange: sessionFilters?.runtimeRange,
      watchProviders,
      watchRegion,
      themes: sessionFilters?.themes,
      tmdbLanguages: sessionFilters?.tmdbLanguages,
      unplayedOnly: sessionFilters?.unplayedOnly,
    };

    // Check cache first
    const filtersHash = this.generateFiltersHash(filterKey);
    let cached = deckCache.getCachedDeck(sessionCode, auth.provider, filterKey);

    if (!cached) {
      // Build the full deck by fetching all items
      logger.info(`Building deterministic deck for session ${sessionCode} with seed ${randomSeed}`);
      const allItems = await this.fetchAllItemsForDeck(
        provider,
        auth,
        includedLibraries,
        sessionFilters,
        watchProviders,
        watchRegion
      );

      // Filter out any undefined/null items
      const validItems = allItems.filter((item): item is MediaItem => item != null && item.Id != null);

      // Apply client-side filters
      let filteredItems = this.applyClientFilters(validItems, sessionFilters);

      // Shuffle with deterministic seed
      const compositeSeed = `${randomSeed}:${filtersHash}`;
      filteredItems = shuffleWithSeed(filteredItems, compositeSeed);

      // Store in cache (skip any invalid items defensively)
      const orderedIds: string[] = [];
      const itemsById = new Map<string, MediaItem>();
      let invalidCount = 0;
      for (const item of filteredItems) {
        if (!item || !item.Id) {
          invalidCount += 1;
          continue;
        }
        orderedIds.push(item.Id);
        itemsById.set(item.Id, item);
      }
      if (invalidCount > 0) {
        logger.warn(`Filtered ${invalidCount} invalid items while building deck for session ${sessionCode}`);
      }
      deckCache.setCachedDeck(sessionCode, auth.provider, filterKey, orderedIds, itemsById);

      cached = { orderedIds, itemsById };
      logger.info(`Deck built with ${orderedIds.length} items`);
    }

    // Get paginated results excluding already swiped items
    const result = deckCache.getPaginatedItems(
      sessionCode,
      auth.provider,
      filterKey,
      excludeIds,
      page,
      limit
    );

    if (!result) {
      // Cache expired or invalid, return empty
      return { items: [], hasMore: false };
    }

    // Load blur data for first item
    if (result.items.length > 0) {
      result.items[0].BlurDataURL = await provider.getBlurDataUrl(result.items[0].Id, "Primary", auth);
    }

    return {
      items: result.items,
      hasMore: result.hasMore,
    };
  }

  private static generateFiltersHash(filters: Record<string, any>): string {
    const sorted = Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
      .join('|');
    
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private static async fetchAllItemsForDeck(
    provider: any,
    auth: any,
    includedLibraries: string[],
    sessionFilters: Filters | null,
    watchProviders: string[] | undefined,
    watchRegion: string
  ): Promise<MediaItem[]> {
    const providerName = auth.provider as ProviderType;
    const allItems: MediaItem[] = [];

    // Provider-specific fetching strategies
    if (providerName === ProviderType.JELLYFIN || providerName === ProviderType.EMBY) {
      return this.fetchAllJellyfinEmbyItems(provider, auth, includedLibraries, sessionFilters, watchProviders, watchRegion);
    } else if (providerName === ProviderType.PLEX) {
      return this.fetchAllPlexItems(provider, auth, includedLibraries, sessionFilters);
    } else if (providerName === ProviderType.TMDB) {
      return this.fetchAllTMDBItems(provider, auth, sessionFilters, watchProviders, watchRegion);
    }

    return allItems;
  }

  private static async fetchAllJellyfinEmbyItems(
    provider: any,
    auth: any,
    includedLibraries: string[],
    sessionFilters: Filters | null,
    watchProviders: string[] | undefined,
    watchRegion: string
  ): Promise<MediaItem[]> {
    const allItems: MediaItem[] = [];
    const seenIds = new Set<string>();
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;
    const maxItems = 10000; // Safety limit

    // Get libraries to fetch from
    let libraries = includedLibraries;
    if (libraries.length === 0) {
      const availableLibraries = await provider.getLibraries(auth);
      libraries = availableLibraries.map((lib: any) => lib.Id);
    }

    // Fetch from each library
    for (const libraryId of libraries) {
      offset = 0;
      hasMore = true;

      while (hasMore && allItems.length < maxItems) {
        try {
          const items = await provider.getItems({
            libraries: [libraryId],
            genres: sessionFilters?.genres,
            years: (sessionFilters?.yearRange && sessionFilters.yearRange[0] !== undefined && sessionFilters.yearRange[1] !== undefined) ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange![0] + i) : undefined,
            ratings: sessionFilters?.officialRatings,
            minCommunityRating: sessionFilters?.minCommunityRating,
            runtimeRange: sessionFilters?.runtimeRange,
            watchProviders,
            watchRegion,
            themes: sessionFilters?.themes,
            tmdbLanguages: sessionFilters?.tmdbLanguages,
            unplayedOnly: sessionFilters?.unplayedOnly,
            sortBy: "SortName", // Use consistent sort for fetching
            limit: batchSize,
            offset,
          }, auth);

          if (items.length === 0) {
            hasMore = false;
            break;
          }

          for (const item of items) {
            if (item && item.Id && !seenIds.has(item.Id)) {
              seenIds.add(item.Id);
              allItems.push(item);
            }
          }

          offset += batchSize;
          hasMore = items.length === batchSize;
        } catch (error) {
          logger.error("Error fetching items for deck:", error);
          hasMore = false;
        }
      }
    }

    return allItems;
  }

  private static async fetchAllPlexItems(
    provider: any,
    auth: any,
    includedLibraries: string[],
    sessionFilters: Filters | null
  ): Promise<MediaItem[]> {
    const allItems: MediaItem[] = [];
    const seenIds = new Set<string>();

    // Get libraries to fetch from
    let libraries = includedLibraries;
    if (libraries.length === 0) {
      const availableLibraries = await provider.getLibraries(auth);
      libraries = availableLibraries
        .filter((lib: any) => lib.CollectionType === "movies")
        .map((lib: any) => lib.Id);
    }

    // Fetch from each library section
    for (const libraryId of libraries) {
      try {
        // Plex doesn't support pagination well in the same way, so fetch larger batches
        const items = await provider.getItems({
          libraries: [libraryId],
          genres: sessionFilters?.genres,
          years: (sessionFilters?.yearRange && sessionFilters.yearRange[0] !== undefined && sessionFilters.yearRange[1] !== undefined) ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange![0] + i) : undefined,
          ratings: sessionFilters?.officialRatings,
          minCommunityRating: sessionFilters?.minCommunityRating,
          runtimeRange: sessionFilters?.runtimeRange,
          themes: sessionFilters?.themes,
          tmdbLanguages: sessionFilters?.tmdbLanguages,
          unplayedOnly: sessionFilters?.unplayedOnly,
          limit: 1000, // Fetch large batch
          offset: 0,
        }, auth);

        for (const item of items) {
          if (item && item.Id && !seenIds.has(item.Id)) {
            seenIds.add(item.Id);
            allItems.push(item);
          }
        }
      } catch (error) {
        logger.error("Error fetching Plex items for deck:", error);
      }
    }

    return allItems;
  }

  private static async fetchAllTMDBItems(
    provider: any,
    auth: any,
    sessionFilters: Filters | null,
    watchProviders: string[] | undefined,
    watchRegion: string
  ): Promise<MediaItem[]> {
    const allItems: MediaItem[] = [];
    const seenIds = new Set<string>();
    const maxPages = 25; // TMDB max is 500 pages, but limit to 25 (500 items) for performance

    // Get genres for ID mapping
    const genres = await provider.getGenres(auth);
    const genreIdMap = new Map(genres.map((g: any) => [g.Name, g.Id]));

    for (let page = 1; page <= maxPages; page++) {
      try {
        const items = await provider.getItems({
          genres: sessionFilters?.genres,
          years: (sessionFilters?.yearRange && sessionFilters.yearRange[0] !== undefined && sessionFilters.yearRange[1] !== undefined) ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange![0] + i) : undefined,
          ratings: sessionFilters?.officialRatings,
          minCommunityRating: sessionFilters?.minCommunityRating,
          runtimeRange: sessionFilters?.runtimeRange,
          watchProviders,
          watchRegion,
          themes: sessionFilters?.themes,
          tmdbLanguages: sessionFilters?.tmdbLanguages,
          sortBy: "Popular", // Use consistent sort
          limit: 20,
          offset: (page - 1) * 20,
        }, auth);

        if (items.length === 0) {
          break;
        }

        for (const item of items) {
          if (item && item.Id && !seenIds.has(item.Id)) {
            seenIds.add(item.Id);
            allItems.push(item);
          }
        }

        // Stop if we got less than a full page
        if (items.length < 20) {
          break;
        }
      } catch (error) {
        logger.error("Error fetching TMDB items for deck:", error);
        break;
      }
    }

    return allItems;
  }

  private static async getSoloItems(sessionFilters: Filters | null, auth: any, provider: any, excludeIds: Set<string>, includedLibraries: string[], watchProviders: string[] | undefined, watchRegion: string, page: number, limit: number, effectiveOffset: number) {
    const soloYears = sessionFilters?.yearRange ? Array.from({ length: (sessionFilters.yearRange[1] ?? 2025) - (sessionFilters.yearRange[0] ?? 1900) + 1 }, (_, i) => (sessionFilters.yearRange?.[0] ?? 1900) + i) : undefined;
    
    // If we have filters but the provider might not support them all (like Plex), 
    // we fetch more items to ensure we have enough after client-side filtering.
    const fetchLimit = (sessionFilters && (
      sessionFilters.genres?.length || 
      sessionFilters.yearRange || 
      sessionFilters.themes?.length || 
      sessionFilters.runtimeRange ||
      sessionFilters.minCommunityRating
    )) ? Math.max(limit * 4, 100) : limit;

    const fetchedItems = await provider.getItems({
      libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
      genres: sessionFilters?.genres,
      years: soloYears,
      ratings: sessionFilters?.officialRatings,
      minCommunityRating: sessionFilters?.minCommunityRating,
      runtimeRange: sessionFilters?.runtimeRange,
      watchProviders,
      watchRegion,
      sortBy: sessionFilters?.sortBy || (auth.provider === 'tmdb' ? "Popular" : "Trending"),
      themes: sessionFilters?.themes,
      tmdbLanguages: sessionFilters?.tmdbLanguages,
      unplayedOnly: sessionFilters?.unplayedOnly !== undefined ? sessionFilters.unplayedOnly : true,
      limit: fetchLimit,
      offset: effectiveOffset
    }, auth);
    
    let items = this.applyClientFilters(fetchedItems, sessionFilters);
    items = items.filter(item => !excludeIds.has(item.Id));
    
    const slicedItems = items.slice(0, limit);

    if (slicedItems.length > 0) {
      slicedItems[0].BlurDataURL = await provider.getBlurDataUrl(slicedItems[0].Id, "Primary", auth);
    }

    return {
      items: slicedItems,
      hasMore: fetchedItems.length >= (auth.provider === 'tmdb' ? 20 : fetchLimit)
    };
  }

  static async getLibraries(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    return provider.getLibraries(auth);
  }

  static async getYears(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    return provider.getYears(auth);
  }

  static async getRatings(session: SessionData, regionOverride?: string) {
    const useStatic = await ConfigService.getUseStaticFilterValues();
    if (useStatic && !session.user.isGuest && session.user.provider !== "tmdb") {
        const { DEFAULT_RATINGS } = await import("@/lib/constants");
        return DEFAULT_RATINGS.map(r => ({ Name: r, Value: r }));
    }

    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    
    if (regionOverride) {
      auth.watchRegion = regionOverride;
    }
    
    try {
        const ratings = await provider.getRatings(auth);
        if (!ratings || ratings.length === 0) {
            const { DEFAULT_RATINGS } = await import("@/lib/constants");
            return DEFAULT_RATINGS.map(r => ({ Name: r, Value: r }));
        }
        return ratings;
    } catch (e) {
        const { DEFAULT_RATINGS } = await import("@/lib/constants");
        return DEFAULT_RATINGS.map(r => ({ Name: r, Value: r }));
    }
  }

  static async getGenres(session: SessionData) {
    const useStatic = await ConfigService.getUseStaticFilterValues();
    if (useStatic && !session.user.isGuest && session.user.provider !== "tmdb") {
        const { DEFAULT_GENRES } = await import("@/lib/constants");
        return DEFAULT_GENRES;
    }

    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    
    try {
        const genres = await provider.getGenres(auth);
        if (!genres || genres.length === 0) {
            const { DEFAULT_GENRES } = await import("@/lib/constants");
            return DEFAULT_GENRES;
        }
        return genres;
    } catch (e) {
        const { DEFAULT_GENRES } = await import("@/lib/constants");
        return DEFAULT_GENRES;
    }
  }

  static async getThemes(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    if (typeof provider.getThemes === 'function') return provider.getThemes(auth);
    return [];
  }

  static async getRegions(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    if (provider.getRegions) return provider.getRegions(auth);
    return [];
  }

  static async getWatchProviders(session: SessionData, region: string, sessionCode?: string | null, wantAll?: boolean) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    const activeProvider = auth.provider || session.user.provider || ProviderType.JELLYFIN;

    if (activeProvider !== "tmdb") {
      return { providers: [] };
    }

    if (!provider.getWatchProviders) return { providers: [] };
    
    const allProviders = await provider.getWatchProviders(region, auth);

    let memberSelections: Record<string, string[]> = {};
    let members: { externalUserId: string, externalUserName: string }[] = [];
    let accumulatedProviderIds: string[] = [];

    if (sessionCode) {
        const dbMembers = await db.query.sessionMembers.findMany({
            where: eq(sessionMembers.sessionCode, sessionCode),
        });
        
        members = dbMembers.map((m: any) => ({ 
            externalUserId: m.externalUserId, 
            externalUserName: m.externalUserName 
        }));

        for (const m of dbMembers) {
            if (m.settings) {
                try {
                    const settings = JSON.parse(m.settings);
                    if (settings.watchProviders) {
                        for (const pId of settings.watchProviders) {
                            if (!memberSelections[pId]) memberSelections[pId] = [];
                            memberSelections[pId].push(m.externalUserId);
                        }
                    }
                } catch (e) {}
            }
        }
        accumulatedProviderIds = Object.keys(memberSelections);
    } else {
        const settings = await ConfigService.getUserSettings(session.user.Id);
        if (settings) {
            if (settings.watchProviders) accumulatedProviderIds = settings.watchProviders;
        }
    }

    if (!wantAll && accumulatedProviderIds.length > 0) {
        const filteredProviders = allProviders
            .filter(p => accumulatedProviderIds.includes(p.Id))
            .map((p: any) => ({
                ...p,
                MemberUserIds: memberSelections[p.Id] || []
            }));
        
        return { 
            providers: filteredProviders,
            members 
        };
    }

    return { providers: allProviders };
  }

  private static applyClientFilters(items: MediaItem[], filters: Filters | null): MediaItem[] {
    let result = items;

    if (!filters) return result;

    if (filters.genres && filters.genres.length > 0) {
      result = result.filter(item => 
        item.Genres?.some(g => filters.genres.includes(g))
      );
    }

    if (filters.themes && filters.themes.length > 0) {
      // Tags/Keywords filtering usually done provider side, but we can double check here
      // if the provider doesn't support it or returns raw data.
      // We check if any of the item's genres or other metadata match the themes if possible
      // but usually themes are provider-side specific tags.
    }

    if (filters.yearRange) {
      const [min, max] = filters.yearRange;
      result = result.filter(item => {
        if (!item.ProductionYear) return false;
        return item.ProductionYear >= min && item.ProductionYear <= max;
      });
    }

    if (filters.officialRatings && filters.officialRatings.length > 0) {
      result = result.filter(item => 
        item.OfficialRating && filters.officialRatings!.includes(item.OfficialRating)
      );
    }

    if (filters.runtimeRange) {
      const [min, max] = filters.runtimeRange;
      result = result.filter(item => {
        if (!item.RunTimeTicks) return true; 
        const minutes = item.RunTimeTicks / 600000000;
        if (min && minutes < min) return false;
        if (max && max < 240 && minutes > max) return false;
        return true;
      });
    }

    if (filters.minCommunityRating) {
      result = result.filter(item => (item.CommunityRating || 0) >= filters.minCommunityRating!);
    }

    if (filters.unplayedOnly === false) {
        // If explicitly false, we don't filter out anything based on played status here
        // The exclusion of swiped items is handled outside this function
    }

    return result;
  }
}
