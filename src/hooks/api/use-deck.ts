import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { JellyfinItem } from "@/types";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useDeck() {
  const { data: session } = useSession();
  const sessionCode = session?.code || null;

  return useQuery<JellyfinItem[]>({
    queryKey: QUERY_KEYS.deck(sessionCode),
    queryFn: async () => {
      const res = await apiClient.get<JellyfinItem[]>("/api/jellyfin/items");
      return res.data;
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  });
}
