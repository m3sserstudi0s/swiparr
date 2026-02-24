"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MediaItem } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useSettings } from "@/lib/settings";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { useSession } from "@/hooks/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { QUERY_KEYS } from "@/hooks/api/query-keys";
import { logger } from "@/lib/logger";

interface UseMovieActionsOptions {
  isLiked?: boolean;
  onUnlikeSuccess?: () => void;
  sessionCode?: string | null;
  syncData?: boolean;
}

export function useMovieActions<T extends MediaItem>(initialMovie: T | null, options: UseMovieActionsOptions = {}) {
  const { onUnlikeSuccess, sessionCode: optionsSessionCode, syncData = true } = options;
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { data: sessionData } = useSession();
  const { provider: runtimeProvider } = useRuntimeConfig();

  // Determine the effective session code for this movie action
  // Preference: 
  // 1. Explicitly passed sessionCode in options
  // 2. sessionCode property from the movie object itself (crucial for LikesList)
  // 3. Current active session code from sessionData (for deck/new swipes)
  const movieSessionCode = optionsSessionCode !== undefined 
    ? optionsSessionCode 
    : (initialMovie && 'sessionCode' in initialMovie 
        ? (initialMovie as any).sessionCode 
        : (sessionData?.code ?? null));

  // Subscribe to the movie query to keep state in sync across components
  const { data: syncedMovie } = useQuery({
    queryKey: QUERY_KEYS.movie(initialMovie?.Id || null, movieSessionCode),
    queryFn: async () => {
      if (!initialMovie?.Id) return null;
      // Pass sessionCode to API to get the correct likedBy context
      const codeParam = movieSessionCode === null ? "" : (movieSessionCode ?? "");
      const res = await apiClient.get<MediaItem>(`/api/media/item/${initialMovie.Id}?sessionCode=${codeParam}`);
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
  const activeProvider = sessionData?.provider || runtimeProvider;
  const useWatchlist = activeProvider === "plex"
    ? true
    : activeProvider === "jellyfin"
      ? settings.useWatchlist
      : false;

  const isInList = (useWatchlist ? currentMovie?.UserData?.Likes : currentMovie?.UserData?.IsFavorite) ?? false;
  
  // A movie is liked by me if it's in the likedBy list for the CORRECT session context
  const isLikedByMe = options.isLiked || (currentMovie?.likedBy?.some(l => 
    l.userId === sessionData?.userId && (l.sessionCode ?? null) === movieSessionCode
  ) ?? false);

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
        
        const movieKey = QUERY_KEYS.movie(currentMovie?.Id || null, movieSessionCode);
        await queryClient.cancelQueries({ queryKey: movieKey });

        const previousMovie = queryClient.getQueryData(movieKey);
        
        if (currentMovie?.Id) {
            queryClient.setQueryData(movieKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    UserData: {
                        ...old.UserData,
                        [useWatchlist ? 'Likes' : 'IsFavorite']: nextValue
                    }
                };
            });
        }
        
        return { previousMovie };
    },
    onError: (err, variables, context) => {
        const movieKey = QUERY_KEYS.movie(currentMovie?.Id || null, movieSessionCode);
        if (currentMovie?.Id && context?.previousMovie) {
            queryClient.setQueryData(movieKey, context.previousMovie);
        }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null, movieSessionCode) });
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
    mutationFn: async (params?: { movie: T; sessionCode: string | null }) => {
      const movie = params?.movie || currentMovie;
      const code = params?.sessionCode ?? movieSessionCode;
      if (!movie) return;
      await apiClient.post("/api/swipe", {
        itemId: movie.Id,
        direction: "right",
        item: movie,
        sessionCode: code
      });
    },
    onMutate: async (params) => {
      const movie = params?.movie || currentMovie;
      const code = params?.sessionCode ?? movieSessionCode;
      const movieKey = QUERY_KEYS.movie(movie?.Id || null, code);
      await queryClient.cancelQueries({ queryKey: movieKey });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likes });

      const previousMovie = queryClient.getQueryData(movieKey);
      const previousLikes = queryClient.getQueryData(QUERY_KEYS.likes);

      if (movie) {
        queryClient.setQueryData(movieKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            likedBy: [
              ...(old.likedBy || []).filter((l: any) => l.userId !== sessionData?.userId),
              {
                userId: sessionData?.userId || '',
                userName: sessionData?.userName || 'Me',
                sessionCode: code,
                hasCustomProfilePicture: sessionData?.hasCustomProfilePicture,
                profileUpdatedAt: sessionData?.profileUpdatedAt
              }
            ]
          };
        });
      }

      return { previousMovie, previousLikes, movieId: movie?.Id, code };
    },
    onSuccess: (_data, variables) => {
      const movie = variables?.movie || currentMovie;
      const code = variables?.sessionCode ?? movieSessionCode;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(movie?.Id || null, code) });
    },
    onError: (err, variables, context) => {
      if (context?.previousLikes) {
        queryClient.setQueryData(QUERY_KEYS.likes, context.previousLikes);
      }
      if (context?.movieId && context?.previousMovie) {
        const movieKey = QUERY_KEYS.movie(context.movieId, context.code);
        queryClient.setQueryData(movieKey, context.previousMovie);
      }
      logger.error("Relike failed:", err);
      toast.error("Failed to re-like movie", {
        description: getErrorMessage(err),
        action: {
          label: 'Retry',
          onClick: () => relike(variables)
        }
      });
    }
  });

  const { mutateAsync: unlike, isPending: isUnliking } = useMutation({
    mutationFn: async () => {
      if (!currentMovie) return;
      
      const codeParam = movieSessionCode === null ? "" : (movieSessionCode ?? "");
      const sessionParam = (movieSessionCode !== undefined) ? `&sessionCode=${codeParam}` : "";

      await apiClient.delete(`/api/user/likes?itemId=${currentMovie.Id}${sessionParam}`);
    },
    onMutate: async () => {
        const movieKey = QUERY_KEYS.movie(currentMovie?.Id || null, movieSessionCode);
        await queryClient.cancelQueries({ queryKey: movieKey });
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likes });

        const previousMovie = queryClient.getQueryData(movieKey);
        const previousLikes = queryClient.getQueryData(QUERY_KEYS.likes);

        if (currentMovie) {
            // Update the individual movie state
            queryClient.setQueryData(movieKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    likedBy: (old.likedBy || []).filter((l: any) => !(l.userId === sessionData?.userId && (l.sessionCode ?? null) === movieSessionCode))
                };
            });

            // Optimistically remove from likes list
            queryClient.setQueriesData({ queryKey: QUERY_KEYS.likes }, (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.filter((item: any) => !(item.Id === currentMovie.Id && (item.sessionCode ?? null) === movieSessionCode));
            });
        }

        return { previousMovie, previousLikes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movie(currentMovie?.Id || null, movieSessionCode) });
      onUnlikeSuccess?.();
    },
    onError: (err, variables, context) => {
        const movieKey = QUERY_KEYS.movie(currentMovie?.Id || null, movieSessionCode);
        if (context?.previousLikes) {
            queryClient.setQueryData(QUERY_KEYS.likes, context.previousLikes);
        }
        if (currentMovie?.Id && context?.previousMovie) {
            queryClient.setQueryData(movieKey, context.previousMovie);
        }
        logger.error("Unlike failed:", err);
        toast.error("Failed to remove from likes", {
          description: getErrorMessage(err),
          action: {
            label: 'Retry',
            onClick: () => unlike()
          }
        });
    }
  });

  const handleUnlike = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentMovie) return;

    const movieToRelike = currentMovie;
    const sessionCodeToUse = movieSessionCode;

    toast.promise(unlike(), {
      loading: "Removing from likes...",
      success: "Movie removed from likes",
      error: (err) => ({
        message: "Failed to remove from likes",
        description: getErrorMessage(err)
      }),
      action: !isUnliking && {
        label: 'Undo',
        onClick: () => relike({ movie: movieToRelike, sessionCode: sessionCodeToUse })
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
