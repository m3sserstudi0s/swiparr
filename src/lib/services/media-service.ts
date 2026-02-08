import { eq, and, isNull } from "drizzle-orm";
import { db, likes, hiddens, sessions, sessionMembers } from "@/lib/db";
import { SessionData, Filters } from "@/types";
import { MediaItem } from "@/types/media";
import { shuffleWithSeed } from "@/lib/utils";
import { getMediaProvider } from "@/lib/providers/factory";
import { ProviderType } from "@/lib/providers/types";
import { AuthService } from "./auth-service";
import { ConfigService } from "./config-service";

export class MediaService {
  static async getMediaItems(session: SessionData, page: number, limit: number, searchTerm?: string) {
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
            ? eq(hiddens.sessionCode, session.sessionCode) 
            : and(eq(hiddens.externalUserId, session.user.Id), isNull(hiddens.sessionCode))
        )
    ]);

    const excludeIds = new Set([
      ...liked.map((l: any) => l.externalId),
      ...hidden.map((h: any) => h.externalId)
    ]);

    // 2. Get Filters
    const sessionFilters = session.sessionCode 
      ? await (async () => {
          const currentSession = await db.select().from(sessions).where(eq(sessions.code, session.sessionCode!)).then((rows: any[]) => rows[0]);
          return currentSession?.filters ? JSON.parse(currentSession.filters) : null;
        })()
      : session.soloFilters;

    const { watchProviders, watchRegion } = await this.resolveWatchProviders(session, sessionFilters, auth, activeProviderName);

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
      return this.getSessionItems(session.sessionCode, sessionFilters, auth, provider, excludeIds, includedLibraries, watchProviders, watchRegion, page, limit);
    } else {
      return this.getSoloItems(sessionFilters, auth, provider, excludeIds, includedLibraries, watchProviders, watchRegion, page, limit);
    }
  }

  private static async resolveWatchProviders(session: SessionData, sessionFilters: Filters | null, auth: any, activeProviderName: string) {
    let watchProviders = sessionFilters?.watchProviders;
    let watchRegion = sessionFilters?.watchRegion || auth.watchRegion || "SE";

    if (!watchProviders && activeProviderName === "tmdb") {
      const accumulated = new Set<string>();
      if (session.sessionCode) {
        const sessionMembersList = await db.query.sessionMembers.findMany({
          where: eq(sessionMembers.sessionCode, session.sessionCode)
        });
        sessionMembersList.forEach((m: any) => {
          if (m.settings) {
            try {
              const s = JSON.parse(m.settings);
              if (s.watchProviders) s.watchProviders.forEach((p: string) => accumulated.add(p));
              if (s.watchRegion) watchRegion = s.watchRegion;
            } catch(e) {}
          }
        });
      } else {
        const settings = await ConfigService.getUserSettings(session.user.Id);
        if (settings) {
          if (settings.watchProviders) settings.watchProviders.forEach((p: string) => accumulated.add(p));
          if (settings.watchRegion) watchRegion = settings.watchRegion;
        }
      }
      watchProviders = accumulated.size > 0 ? Array.from(accumulated) : undefined;
    }
    return { watchProviders, watchRegion };
  }

  private static async getSessionItems(sessionCode: string, sessionFilters: Filters | null, auth: any, provider: any, excludeIds: Set<string>, includedLibraries: string[], watchProviders: string[] | undefined, watchRegion: string, page: number, limit: number) {
    const allItems = await provider.getItems({
      libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
      genres: sessionFilters?.genres,
      years: (sessionFilters?.yearRange && sessionFilters.yearRange[0] !== undefined && sessionFilters.yearRange[1] !== undefined) ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange![0] + i) : undefined,
      ratings: sessionFilters?.officialRatings,
      minCommunityRating: sessionFilters?.minCommunityRating,
      watchProviders,
      watchRegion,
      sortBy: sessionFilters?.sortBy,
      themes: sessionFilters?.themes,
      languages: sessionFilters?.languages,
      limit: 1000,
    }, auth);

    let filteredItems = this.applyClientFilters(allItems, sessionFilters);
    
    // Deterministic Shuffle:
    // If we are in a session, we MUST use shuffleWithSeed for ALL sort modes except "Random".
    const isSorted = sessionFilters?.sortBy && sessionFilters.sortBy !== "Random";
    const shuffledItems = isSorted ? filteredItems : shuffleWithSeed(filteredItems, sessionCode);
    const slicedItems = shuffledItems.slice(page * limit, (page + 1) * limit);
    const items = slicedItems.filter(item => !excludeIds.has(item.Id));

    if (items.length > 0) {
      items[0].BlurDataURL = await provider.getBlurDataUrl(items[0].Id, "Primary", auth);
    }

    return {
      items,
      hasMore: (page + 1) * limit < shuffledItems.length
    };
  }

  private static async getSoloItems(sessionFilters: Filters | null, auth: any, provider: any, excludeIds: Set<string>, includedLibraries: string[], watchProviders: string[] | undefined, watchRegion: string, page: number, limit: number) {
    const soloYears = sessionFilters?.yearRange ? Array.from({ length: (sessionFilters.yearRange[1] ?? 2025) - (sessionFilters.yearRange[0] ?? 1900) + 1 }, (_, i) => (sessionFilters.yearRange?.[0] ?? 1900) + i) : undefined;
    
    // If we have filters but the provider might not support them all (like Plex), 
    // we fetch more items to ensure we have enough after client-side filtering.
    const fetchLimit = (sessionFilters && (sessionFilters.genres?.length || sessionFilters.yearRange || sessionFilters.themes?.length)) ? Math.max(limit * 4, 100) : limit;

    const fetchedItems = await provider.getItems({
      libraries: includedLibraries.length > 0 ? includedLibraries : undefined,
      genres: sessionFilters?.genres,
      years: soloYears,
      ratings: sessionFilters?.officialRatings,
      minCommunityRating: sessionFilters?.minCommunityRating,
      watchProviders,
      watchRegion,
      sortBy: sessionFilters?.sortBy || "Random",
      themes: sessionFilters?.themes,
      languages: sessionFilters?.languages,
      unplayedOnly: true,
      limit: fetchLimit,
      offset: page * limit
    }, auth);
    
    let items = this.applyClientFilters(fetchedItems, sessionFilters);
    items = items.filter(item => !excludeIds.has(item.Id));
    
    const slicedItems = items.slice(0, limit);

    if (slicedItems.length > 0) {
      slicedItems[0].BlurDataURL = await provider.getBlurDataUrl(slicedItems[0].Id, "Primary", auth);
    }

    return {
      items: slicedItems,
      hasMore: fetchedItems.length === fetchLimit
    };
  }

  static async getLibraries(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    return provider.getLibraries(auth);
  }

  static async getGenres(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    return provider.getGenres(auth);
  }

  static async getYears(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    return provider.getYears(auth);
  }

  static async getRatings(session: SessionData, regionOverride?: string) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    // If region override is provided, use it
    if (regionOverride) {
      auth.watchRegion = regionOverride;
    }
    return provider.getRatings(auth);
  }

  static async getThemes(session: SessionData) {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);
    if (provider.getThemes) return provider.getThemes(auth);
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
        const minutes = (item.RunTimeTicks || 0) / 600000000;
        if (min && minutes < min) return false;
        if (max && max < 240 && minutes > max) return false;
        return true;
      });
    }

    if (filters.minCommunityRating) {
      result = result.filter(item => (item.CommunityRating || 0) >= filters.minCommunityRating!);
    }

    if (filters.themes && filters.themes.length > 0) {
      // Tags/Keywords filtering usually done provider side, but we can double check here
      // if the provider doesn't support it or returns raw data.
      // For now we assume provider side is sufficient but keep the door open.
    }

    return result;
  }
}
