import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { SessionStatus, Filters, SessionSettings } from "@/types";
import { QUERY_KEYS } from "./query-keys";
import { toast } from "sonner";

export function useSession() {
  return useQuery<SessionStatus | null>({
    queryKey: QUERY_KEYS.session,
    queryFn: async () => {
      try {
        const res = await apiClient.get<SessionStatus | null>("/api/session");
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 1000 * 30, // 30 seconds stale time is better for reactive UI
    refetchInterval: (query) => {
      // Poll more frequently if we are in a session to catch filter/settings updates from other users
      return query.state.data?.code ? 5000 : false;
    }
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { filters?: Filters; settings?: SessionSettings; allowGuestLending?: boolean }) => {
      const res = await apiClient.patch<SessionStatus>("/api/session", payload);
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.session });
      const previousSession = queryClient.getQueryData<SessionStatus | null>(QUERY_KEYS.session);

      if (previousSession) {
        queryClient.setQueryData<SessionStatus | null>(QUERY_KEYS.session, {
          ...previousSession,
          filters: payload.filters !== undefined ? payload.filters : previousSession.filters,
          settings: payload.settings !== undefined ? payload.settings : previousSession.settings,
        });
      }

      return { previousSession };
    },
    onError: (err, variables, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(QUERY_KEYS.session, context.previousSession);
      }
      // Show error toast
      const errorMessage = (err as any)?.response?.data?.error || "Failed to update session";
      toast.error(errorMessage);
    },
    onSettled: async (data, error, variables, context) => {
      // Refetch session first to ensure we have the latest data (including filters)
      // This is critical because the session query has a 5-minute staleTime
      await queryClient.refetchQueries({ queryKey: QUERY_KEYS.session });
      
      // Get the fresh session data after refetch
      const currentSession = queryClient.getQueryData<SessionStatus | null>(QUERY_KEYS.session);
      const sessionCode = currentSession?.code;
      
      // Then invalidate deck with the correct query key pattern
      // This ensures the deck reloads with the updated filters
      if (sessionCode) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
      }
      await queryClient.invalidateQueries({ queryKey: ["deck"] });
    },
  });
}

export function useJoinSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await apiClient.post<SessionStatus>("/api/session", { action: "join", code });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
      queryClient.invalidateQueries({ queryKey: ["deck"] });
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { allowGuestLending?: boolean }) => {
      const res = await apiClient.post<SessionStatus>("/api/session", { action: "create", ...payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
      queryClient.invalidateQueries({ queryKey: ["deck"] });
    },
  });
}

export function useLeaveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete("/api/session");
    },
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEYS.session, (old: any) => ({ ...old, code: null, filters: null, settings: null }));
      queryClient.invalidateQueries({ queryKey: ["deck"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
      queryClient.invalidateQueries({ queryKey: ["movie"] });
    },
  });
}
