import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useKickMember() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      await apiClient.delete(`/api/session/members?userId=${encodeURIComponent(targetUserId)}`);
    },
    onSuccess: () => {
      if (session?.code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(session.code) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(session.code) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(session.code) });
      }
    },
  });
}
