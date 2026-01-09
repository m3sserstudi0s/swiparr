import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { JellyfinItem } from "@/types";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useMatches() {
  const { data: session } = useSession();
  const sessionCode = session?.code;

  return useQuery<JellyfinItem[]>({
    queryKey: QUERY_KEYS.matches(sessionCode!),
    queryFn: async () => {
      const res = await apiClient.get<JellyfinItem[]>(`/api/session/matches`);
      return res.data;
    },
    enabled: !!sessionCode,
  });
}
