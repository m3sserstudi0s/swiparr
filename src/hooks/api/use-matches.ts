import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MediaItem } from "@/types";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useMatches() {
  const { data: session } = useSession();
  const sessionCode = session?.code;

  return useQuery<MediaItem[]>({
    queryKey: QUERY_KEYS.matches(sessionCode!),
    queryFn: async () => {
      const res = await apiClient.get<MediaItem[]>(`/api/session/matches`);
      return res.data;
    },
    enabled: !!sessionCode,
  });
}
