import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { JellyfinItem, SwipePayload, SwipeResponse, SessionStats } from "@/types";
import { QUERY_KEYS } from "./query-keys";
import { useSession } from "./use-session";

export function useSwipe() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const sessionCode = session?.code || null;

  return useMutation({
    mutationFn: async (payload: SwipePayload) => {
      const res = await apiClient.post<SwipeResponse>("/api/swipe", payload);
      return res.data;
    },
    onMutate: async (payload) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.stats(sessionCode!) });

      // Snapshot the previous value
      const previousDeck = queryClient.getQueryData<JellyfinItem[]>(QUERY_KEYS.deck(sessionCode));
      const previousStats = queryClient.getQueryData<SessionStats>(QUERY_KEYS.stats(sessionCode!));

      // Optimistically update to the new value
      if (previousDeck) {
        queryClient.setQueryData(QUERY_KEYS.deck(sessionCode), (old: JellyfinItem[] | undefined) => 
          old?.filter(item => item.Id !== payload.itemId)
        );
      }

      if (previousStats) {
        queryClient.setQueryData(QUERY_KEYS.stats(sessionCode!), (old: SessionStats | undefined) => {
          if (!old) return old;
          return {
            ...old,
            mySwipes: {
              ...old.mySwipes,
              [payload.direction]: old.mySwipes[payload.direction] + 1
            }
          };
        });
      }

      // Return a context object with the snapshotted value
      return { previousDeck, previousStats };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newSwipe, context) => {
      if (context?.previousDeck) {
        queryClient.setQueryData(QUERY_KEYS.deck(sessionCode), context.previousDeck);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(QUERY_KEYS.stats(sessionCode!), context.previousStats);
      }
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats(sessionCode!) });
      // We don't necessarily want to refetch the whole deck on every swipe
      // but maybe just invalidate to keep it fresh
    },
    onSuccess: (data) => {
      if (data.isMatch) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode!) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
    }
  });
}

export function useUndoSwipe() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const sessionCode = session?.code || null;

  return useMutation({
    mutationFn: async (itemId: string) => {
      await apiClient.delete("/api/swipe", { data: { itemId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats(sessionCode!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
    },
  });
}
