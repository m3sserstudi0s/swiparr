import { useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MediaItem, SwipePayload, SwipeResponse, SessionStats } from "@/types";
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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likes });

      // Snapshot the previous value
      const previousDeck = queryClient.getQueryData<InfiniteData<{ items: MediaItem[]; hasMore: boolean }>>(QUERY_KEYS.deck(sessionCode));
      const previousStats = queryClient.getQueryData<SessionStats>(QUERY_KEYS.stats(sessionCode!));
      const previousLikesQueries = queryClient.getQueriesData({ queryKey: QUERY_KEYS.likes });

      // Optimistically update to the new value
      if (previousDeck) {
        queryClient.setQueryData<InfiniteData<{ items: MediaItem[]; hasMore: boolean }>>(QUERY_KEYS.deck(sessionCode), (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              items: page.items.filter(item => item.Id !== payload.itemId)
            }))
          };
        });
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

      if (payload.direction === "right" && payload.item) {
        const swipedItem = payload.item;
        queryClient.setQueriesData({ queryKey: QUERY_KEYS.likes }, (old: any) => {
          if (!Array.isArray(old)) return old;
          const targetSessionCode = payload.sessionCode ?? sessionCode;
          if (old.some((item: any) => item.Id === payload.itemId && (item.sessionCode ?? null) === targetSessionCode)) return old;
          
          const newLike = {
            ...swipedItem,
            swipedAt: new Date().toISOString(),
            sessionCode: targetSessionCode,
            likedBy: [
              ...(swipedItem.likedBy || []),
              {
                userId: session?.userId || '',
                userName: session?.userName || 'Me',
                sessionCode: payload.sessionCode || sessionCode,
                hasCustomProfilePicture: session?.hasCustomProfilePicture,
                profileUpdatedAt: session?.profileUpdatedAt
              }
            ]
          };
          return [newLike, ...old];
        });
      }

      // Return a context object with the snapshotted value
      return { previousDeck, previousStats, previousLikesQueries };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newSwipe, context) => {
      if (context?.previousDeck) {
        queryClient.setQueryData(QUERY_KEYS.deck(sessionCode), context.previousDeck);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(QUERY_KEYS.stats(sessionCode!), context.previousStats);
      }
      if (context?.previousLikesQueries) {
        context.previousLikesQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
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
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likes });
      const previousLikesQueries = queryClient.getQueriesData({ queryKey: QUERY_KEYS.likes });

      queryClient.setQueriesData({ queryKey: QUERY_KEYS.likes }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item: any) => !(item.Id === itemId && (item.sessionCode ?? null) === sessionCode));
      });

      return { previousLikesQueries };
    },
    onError: (err, itemId, context) => {
      if (context?.previousLikesQueries) {
        context.previousLikesQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats(sessionCode!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches(sessionCode!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
    },
  });
}
