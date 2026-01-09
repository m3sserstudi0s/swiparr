import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { SessionMember } from "@/types";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useMembers() {
  const { data: session } = useSession();
  const sessionCode = session?.code;

  return useQuery<SessionMember[]>({
    queryKey: QUERY_KEYS.members(sessionCode!),
    queryFn: async () => {
      const res = await apiClient.get<SessionMember[]>(`/api/session/members`);
      return res.data;
    },
    enabled: !!sessionCode,
  });
}
