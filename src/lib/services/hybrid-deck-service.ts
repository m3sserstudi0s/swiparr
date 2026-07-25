import { Filters } from "@/types";
import { MediaItem, WatchProvider } from "@/types/media";
import { HYBRID_MONETIZATION_TYPES, HYBRID_TMDB_MAX_PAGES_PER_PROVIDER } from "@/lib/constants";
import { toHybridStreamingId, getTmdbProviderId } from "@/lib/providers/item-source";
import { logger } from "@/lib/logger";

/**
 * Builds the merged deck for hybrid mode: the user's library (Jellyfin)
 * plus movies streamable on the selected services (TMDB discover).
 *
 * Titles present in both worlds are deduped by TMDB id (falling back to
 * normalized title + year) - the library card wins and inherits the
 * streaming availability so it can be badged with all sources.
 */
export class HybridDeckService {
  static async fetchAllHybridItems(options: {
    tmdbProvider: any;
    auth: any;
    sessionFilters: Filters | null;
    watchProviders: string[];
    watchRegion: string;
    fetchLibraryItems: () => Promise<MediaItem[]>;
  }): Promise<MediaItem[]> {
    const { tmdbProvider, auth, sessionFilters, watchProviders, watchRegion, fetchLibraryItems } = options;

    const [libraryItems, providerMeta] = await Promise.all([
      fetchLibraryItems(),
      this.getProviderMeta(tmdbProvider, watchRegion, auth),
    ]);

    // Saved selections may predate a TMDB_ALLOWED_WATCH_PROVIDERS allowlist -
    // ids without metadata were filtered out and must not feed the deck.
    // Skip the guard when the metadata fetch itself failed (empty map), so a
    // TMDB hiccup doesn't silently drop the whole streaming leg.
    const activeServiceIds = providerMeta.size > 0
      ? watchProviders.filter((id) => providerMeta.has(id))
      : watchProviders;

    // Crawl discover once per selected service (not one union call): only a
    // per-service crawl can attribute each title to the services carrying it.
    const streaming = new Map<string, { item: MediaItem; serviceIds: Set<string> }>();
    await Promise.all(
      activeServiceIds.map(async (serviceId) => {
        const items = await this.fetchServiceCatalog(tmdbProvider, auth, sessionFilters, serviceId, watchRegion);
        for (const item of items) {
          const existing = streaming.get(item.Id);
          if (existing) {
            existing.serviceIds.add(serviceId);
          } else {
            streaming.set(item.Id, { item, serviceIds: new Set([serviceId]) });
          }
        }
      })
    );

    // Index library items for dedupe
    const libraryByTmdbId = new Map<string, MediaItem>();
    const libraryByTitleYear = new Map<string, MediaItem>();
    for (const item of libraryItems) {
      item.InLibrary = true;
      const tmdbId = getTmdbProviderId(item);
      if (tmdbId) libraryByTmdbId.set(tmdbId, item);
      const titleKey = this.titleYearKey(item);
      if (titleKey) libraryByTitleYear.set(titleKey, item);
    }

    // Merge: library card wins and inherits streaming availability;
    // streaming-only titles become tmdb:-prefixed cards.
    const merged: MediaItem[] = [...libraryItems];
    for (const { item, serviceIds } of streaming.values()) {
      const watchProviderList = Array.from(serviceIds)
        .map((id) => providerMeta.get(id))
        .filter((p): p is WatchProvider => !!p);

      const libraryMatch = libraryByTmdbId.get(item.Id)
        || (this.titleYearKey(item) ? libraryByTitleYear.get(this.titleYearKey(item)!) : undefined);

      if (libraryMatch) {
        libraryMatch.WatchProviders = watchProviderList;
      } else {
        merged.push({
          ...item,
          Id: toHybridStreamingId(item.Id),
          InLibrary: false,
          WatchProviders: watchProviderList,
        });
      }
    }

    logger.info(
      `Hybrid deck built: ${libraryItems.length} library items, ${streaming.size} streaming titles, ${merged.length} merged`
    );

    return merged;
  }

  private static async getProviderMeta(tmdbProvider: any, watchRegion: string, auth: any): Promise<Map<string, WatchProvider>> {
    try {
      const providers: WatchProvider[] = await tmdbProvider.getWatchProviders(watchRegion, auth);
      return new Map(providers.map((p) => [p.Id, p]));
    } catch (error) {
      logger.error("Error fetching watch provider metadata for hybrid deck:", error);
      return new Map();
    }
  }

  private static async fetchServiceCatalog(
    tmdbProvider: any,
    auth: any,
    sessionFilters: Filters | null,
    serviceId: string,
    watchRegion: string
  ): Promise<MediaItem[]> {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    for (let page = 1; page <= HYBRID_TMDB_MAX_PAGES_PER_PROVIDER; page++) {
      try {
        const pageItems = await tmdbProvider.getItems({
          genres: sessionFilters?.genres,
          excludedGenres: sessionFilters?.excludedGenres,
          years: (sessionFilters?.yearRange && sessionFilters.yearRange[0] !== undefined && sessionFilters.yearRange[1] !== undefined)
            ? Array.from({ length: sessionFilters.yearRange[1] - sessionFilters.yearRange[0] + 1 }, (_, i) => sessionFilters.yearRange![0] + i)
            : undefined,
          ratings: sessionFilters?.officialRatings,
          excludedRatings: sessionFilters?.excludedOfficialRatings,
          minCommunityRating: sessionFilters?.minCommunityRating,
          runtimeRange: sessionFilters?.runtimeRange,
          watchProviders: [serviceId],
          watchRegion,
          watchMonetizationTypes: HYBRID_MONETIZATION_TYPES,
          themes: sessionFilters?.themes,
          excludedThemes: sessionFilters?.excludedThemes,
          tmdbLanguages: sessionFilters?.tmdbLanguages,
          sortBy: "Popular", // Deterministic crawl order; the deck gets seeded-shuffled anyway
          limit: 20,
          offset: (page - 1) * 20,
        }, auth);

        if (pageItems.length === 0) break;

        for (const item of pageItems) {
          if (item && item.Id && !seenIds.has(item.Id)) {
            seenIds.add(item.Id);
            items.push(item);
          }
        }

        if (pageItems.length < 20) break;
      } catch (error) {
        logger.error(`Error fetching streaming catalog for provider ${serviceId}:`, error);
        break;
      }
    }

    return items;
  }

  private static titleYearKey(item: MediaItem): string | undefined {
    if (!item.Name || !item.ProductionYear) return undefined;
    return `${item.Name.trim().toLowerCase()}|${item.ProductionYear}`;
  }
}
