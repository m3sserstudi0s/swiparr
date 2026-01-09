import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { SessionStatus, Filters, SessionSettings } from "@/types";
import { QUERY_KEYS } from "./query-keys";

export function useSession() {
  return useQuery<SessionStatus>({
    queryKey: QUERY_KEYS.session,
    queryFn: async () => {
      const res = await apiClient.get<SessionStatus>("/api/session");
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
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
      const previousSession = queryClient.getQueryData<SessionStatus>(QUERY_KEYS.session);

      if (previousSession) {
        queryClient.setQueryData<SessionStatus>(QUERY_KEYS.session, {
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
      queryClient.invalidateQueries({ queryKey: ["deck"] });
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
    },
  });
}
