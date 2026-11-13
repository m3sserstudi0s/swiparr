import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MediaItem } from "@/types/media";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";
import { useRuntimeConfig } from "@/lib/runtime-config";

export function useDeck() {
  const { data: session } = useSession();
  const sessionCode = session?.code || null;
  const filters = session?.filters || null;
  // A deploy can change what the same filters return (kinds default to every kind since 1.10.4).
  // Keying the deck on the running version means a release is picked up on the next render instead
  // of after a manual reload.
  const { version } = useRuntimeConfig();

  return useInfiniteQuery<{ items: MediaItem[]; hasMore: boolean }>({
    queryKey: [...QUERY_KEYS.deck(sessionCode), filters, version],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get<{ items: MediaItem[]; hasMore: boolean }>("/api/media/items", {
        params: {
          page: pageParam,
          limit: 20,
          filters: filters ? JSON.stringify(filters) : undefined,
        },
      });
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!session,
    gcTime: 0, // Don't cache deck data when switching modes (session, solo) to avoid showing stale card stacks
  });
}
