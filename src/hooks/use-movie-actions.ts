"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MediaItem } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useSettings } from "@/lib/settings";
import { useSession } from "@/hooks/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { QUERY_KEYS } from "@/hooks/api/query-keys";

interface UseMovieActionsOptions {
  isLiked?: boolean;
  onUnlikeSuccess?: () => void;
  sessionCode?: string | null;
  syncData?: boolean;
}

export function useMovieActions<T extends MediaItem>(initialMovie: T | null, options: UseMovieActionsOptions = {}) {
  const { onUnlikeSuccess, sessionCode, syncData = true } = options;
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { data: sessionData } = useSession();

  // Subscribe to the movie query to keep state in sync across components
  const { data: syncedMovie } = useQuery({
    queryKey: QUERY_KEYS.movie(initialMovie?.Id || null),
    queryFn: async () => {
      if (!initialMovie?.Id) return null;
      const res = await apiClient.get<MediaItem>(`/api/media/item/${initialMovie.Id}`);
      return res.data;
    },
    enabled: !!initialMovie?.Id && syncData,
    initialData: initialMovie || undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Merge synced data with initial data to preserve extra fields like swipedAt for MergedLike
  const currentMovie = (syncedMovie && initialMovie 
    ? { ...initialMovie, ...syncedMovie } 
    : (syncedMovie || initialMovie)) as T | null;

  const isGuest = sessionData?.isGuest || false;
  const useWatchlist = settings.useWatchlist;

  const isInList = (useWatchlist ? currentMovie?.UserData?.Likes : currentMovie?.UserData?.IsFavorite) ?? false;
  
  // A movie is liked by me if it's in the likedBy list OR if it's a MergedLike and we're in the likes list
  const isLikedByMe = options.isLiked || (currentMovie?.likedBy?.some(l => l.userId === sessionData?.userId) ?? false);

  const { mutateAsync: toggleWatchlist, isPending: isTogglingWatchlist } = useMutation({
    mutationFn: async (actionOverride?: "add" | "remove") => {
      if (isGuest || !currentMovie) return;
      const action = actionOverride || (isInList ? "remove" : "add");
      await apiClient.post("/api/user/watchlist", {
        itemId: currentMovie.Id,
        action,
        useWatchlist
      });
    },
    onMutate: async (actionOverride) => {
        // Optimistic update
        const action = actionOverride || (isInList ? "remove" : "add");
        const nextValue = action === "add";
        
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null) });
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likes });

        const previousMovie = queryClient.getQueryData(QUERY_KEYS.movie(currentMovie?.Id || null));
        const previousLikesQueries = queryClient.getQueriesData({ queryKey: QUERY_KEYS.likes });
        
        if (currentMovie?.Id) {
            queryClient.setQueryData(QUERY_KEYS.movie(currentMovie.Id), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    UserData: {
                        ...old.UserData,
                        [useWatchlist ? 'Likes' : 'IsFavorite']: nextValue
                    }
                };
            });

            queryClient.setQueriesData({ queryKey: QUERY_KEYS.likes }, (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.map((item: any) => {
                    if (item.Id === currentMovie.Id) {
                        return {
                            ...item,
                            UserData: {
                                ...item.UserData,
                                [useWatchlist ? 'Likes' : 'IsFavorite']: nextValue
                            }
                        };
                    }
                    return item;
                });
            });
        }
        
        return { previousMovie, previousLikesQueries };
    },
    onError: (err, variables, context) => {
        if (currentMovie?.Id && context?.previousMovie) {
            queryClient.setQueryData(QUERY_KEYS.movie(currentMovie.Id), context.previousMovie);
        }
        if (context?.previousLikesQueries) {
            context.previousLikesQueries.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
        }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
    },
  });

  const handleToggleWatchlist = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isGuest || !currentMovie) return;
    const action = isInList ? "remove" : "add";

    toast.promise(toggleWatchlist(undefined), {
      loading: "Updating...",
      success: () => {
        return {
          message: action === "remove"
            ? `Removed from ${useWatchlist ? "watchlist" : "favorites"}`
            : `Added to ${useWatchlist ? "watchlist" : "favorites"}`,
          action: {
            label: 'Undo',
            onClick: () => toggleWatchlist(action === "remove" ? "add" : "remove")
          }
        };
      },
      error: (err) => ({
        message: `Failed to update ${useWatchlist ? "watchlist" : "favorites"}`,
        description: getErrorMessage(err)
      }),
      position: 'top-right'
    });
  };

  const { mutateAsync: relike } = useMutation({
    mutationFn: async () => {
      if (!currentMovie) return;
      const userLike = currentMovie.likedBy?.find(l => l.userId === sessionData?.userId);
      const movieSessionCode = (currentMovie as any).sessionCode;
      const targetSessionCode = userLike?.sessionCode ?? movieSessionCode ?? sessionCode;

      await apiClient.post("/api/swipe", {
        itemId: currentMovie.Id,
        direction: "right",
        item: currentMovie,
        sessionCode: targetSessionCode || null
      });
    },
    onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likes });
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null) });

        const previousLikesQueries = queryClient.getQueriesData({ queryKey: QUERY_KEYS.likes });
        const previousMovie = queryClient.getQueryData(QUERY_KEYS.movie(currentMovie?.Id || null));

        if (currentMovie) {
            queryClient.setQueriesData({ queryKey: QUERY_KEYS.likes }, (old: any) => {
                if (!Array.isArray(old)) return old;
                if (old.some((item: any) => item.Id === currentMovie.Id)) return old;

                const newLike = {
                    ...currentMovie,
                    swipedAt: new Date().toISOString(),
                    likedBy: [
                        ...(currentMovie.likedBy || []),
                        {
                            userId: sessionData?.userId || '',
                            userName: sessionData?.userName || 'Me',
                            sessionCode: sessionCode || null
                        }
                    ]
                };
                return [newLike, ...old];
            });

            queryClient.setQueryData(QUERY_KEYS.movie(currentMovie.Id), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    likedBy: [
                        ...(old.likedBy || []),
                        {
                            userId: sessionData?.userId || '',
                            userName: sessionData?.userName || 'Me',
                            sessionCode: sessionCode || null
                        }
                    ]
                };
            });
        }

        return { previousLikesQueries, previousMovie };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null) });
    },
    onError: (err, variables, context) => {
      if (context?.previousLikesQueries) {
          context.previousLikesQueries.forEach(([queryKey, data]) => {
              queryClient.setQueryData(queryKey, data);
          });
      }
      if (currentMovie?.Id && context?.previousMovie) {
          queryClient.setQueryData(QUERY_KEYS.movie(currentMovie.Id), context.previousMovie);
      }
      toast.error("Failed to re-like movie", {
        description: getErrorMessage(err)
      });
    }
  });

  const { mutateAsync: unlike, isPending: isUnliking } = useMutation({
    mutationFn: async () => {
      if (!currentMovie) return;
      const userLike = currentMovie.likedBy?.find(l => l.userId === sessionData?.userId);
      const movieSessionCode = (currentMovie as any).sessionCode;
      const targetSessionCode = userLike?.sessionCode ?? movieSessionCode ?? sessionCode;
      
      // Use empty string for solo likes if we have a null sessionCode
      const codeParam = targetSessionCode === null ? "" : (targetSessionCode ?? "");
      const sessionParam = (targetSessionCode !== undefined) ? `&sessionCode=${codeParam}` : "";

      await apiClient.delete(`/api/user/likes?itemId=${currentMovie.Id}${sessionParam}`);
    },
    onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likes });
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null) });

        const previousLikesQueries = queryClient.getQueriesData({ queryKey: QUERY_KEYS.likes });
        const previousMovie = queryClient.getQueryData(QUERY_KEYS.movie(currentMovie?.Id || null));

        if (currentMovie) {
            queryClient.setQueriesData({ queryKey: QUERY_KEYS.likes }, (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.filter((item: any) => item.Id !== currentMovie.Id);
            });

            queryClient.setQueryData(QUERY_KEYS.movie(currentMovie.Id), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    likedBy: (old.likedBy || []).filter((l: any) => l.userId !== sessionData?.userId)
                };
            });
        }

        return { previousLikesQueries, previousMovie };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null) });
      onUnlikeSuccess?.();
    },
    onError: (err, variables, context) => {
        if (context?.previousLikesQueries) {
            context.previousLikesQueries.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
        }
        if (currentMovie?.Id && context?.previousMovie) {
            queryClient.setQueryData(QUERY_KEYS.movie(currentMovie.Id), context.previousMovie);
        }
    }
  });

  const handleUnlike = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentMovie) return;

    toast.promise(unlike(), {
      loading: "Removing from likes...",
      success: "Movie removed from likes",
      error: (err) => ({
        message: "Failed to remove from likes",
        description: getErrorMessage(err)
      }),
      action: !isUnliking && {
        label: 'Undo',
        onClick: () => relike()
      },
      position: 'top-right'
    });
  };

  return {
    movie: currentMovie,
    isInList,
    isLikedByMe,
    isTogglingWatchlist,
    isUnliking,
    handleToggleWatchlist,
    handleUnlike,
    relike,
    useWatchlist,
    isGuest
  };
}
