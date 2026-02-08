import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MediaItem } from "@/types/media";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useDeck() {
  const { data: session } = useSession();
  const sessionCode = session?.code || null;
  const filters = session?.filters || null;

  return useInfiniteQuery<{ items: MediaItem[]; hasMore: boolean }>({
    queryKey: [...QUERY_KEYS.deck(sessionCode), filters],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get<{ items: MediaItem[]; hasMore: boolean }>("/api/media/items", {
        params: {
          page: pageParam,
          limit: 50,
        },
      });
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  });
}
