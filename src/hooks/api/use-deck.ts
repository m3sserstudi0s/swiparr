import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MediaItem } from "@/types/media";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useDeck() {
  const { data: session } = useSession();
  const sessionCode = session?.code || null;

  return useQuery<MediaItem[]>({
    queryKey: QUERY_KEYS.deck(sessionCode),
    queryFn: async () => {
      const res = await apiClient.get<MediaItem[]>("/api/media/items");
      return res.data;
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  });
}
