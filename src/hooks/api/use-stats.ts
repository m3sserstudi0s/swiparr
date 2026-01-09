import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { SessionStats } from "@/types";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useStats() {
  const { data: session } = useSession();
  const sessionCode = session?.code;

  return useQuery<SessionStats>({
    queryKey: QUERY_KEYS.stats(sessionCode!),
    queryFn: async () => {
      const res = await apiClient.get<SessionStats>(`/api/session/stats`);
      return res.data;
    },
    enabled: !!sessionCode,
  });
}
