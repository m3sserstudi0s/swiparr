"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MediaItem } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useSettings } from "@/lib/settings";
import { useSession } from "@/hooks/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

interface UseMovieActionsOptions {
  onUnlikeSuccess?: () => void;
  sessionCode?: string | null;
}

export function useMovieActions(movie: MediaItem | null, options: UseMovieActionsOptions = {}) {
  const { onUnlikeSuccess, sessionCode } = options;
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { data: sessionData } = useSession();

  const isGuest = sessionData?.isGuest || false;
  const useWatchlist = settings.useWatchlist;

  const isInList = (useWatchlist ? movie?.UserData?.Likes : movie?.UserData?.IsFavorite) ?? false;
  const isLikedByMe = movie?.likedBy?.some(l => l.userId === sessionData?.userId) ?? false;

  const { mutateAsync: toggleWatchlist, isPending: isTogglingWatchlist } = useMutation({
    mutationFn: async (actionOverride?: "add" | "remove") => {
      if (isGuest || !movie) return;
      const action = actionOverride || (isInList ? "remove" : "add");
      await apiClient.post("/api/user/watchlist", {
        itemId: movie.Id,
        action,
        useWatchlist
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie", movie?.Id] });
      queryClient.invalidateQueries({ queryKey: ["likes"] });
    },
  });

  const handleToggleWatchlist = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isGuest || !movie) return;
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
      if (!movie) return;
      const userLike = movie.likedBy?.find(l => l.userId === sessionData?.userId);
      // For MergedLike, we might have sessionCode on the movie object itself (from MovieListItem)
      const movieSessionCode = (movie as any).sessionCode;
      const targetSessionCode = userLike?.sessionCode ?? movieSessionCode ?? sessionCode;

      await apiClient.post("/api/swipe", {
        itemId: movie.Id,
        direction: "right",
        item: movie,
        sessionCode: targetSessionCode || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
      queryClient.invalidateQueries({ queryKey: ["movie", movie?.Id] });
    },
    onError: (err) => {
      toast.error("Failed to re-like movie", {
        description: getErrorMessage(err)
      });
    }
  });

  const { mutateAsync: unlike, isPending: isUnliking } = useMutation({
    mutationFn: async () => {
      if (!movie) return;
      const userLike = movie.likedBy?.find(l => l.userId === sessionData?.userId);
      const movieSessionCode = (movie as any).sessionCode;
      const targetSessionCode = userLike?.sessionCode ?? movieSessionCode ?? sessionCode;
      const sessionParam = targetSessionCode !== undefined ? `&sessionCode=${targetSessionCode ?? ""}` : "";

      await apiClient.delete(`/api/user/likes?itemId=${movie.Id}${sessionParam}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
      queryClient.invalidateQueries({ queryKey: ["movie", movie?.Id] });
      onUnlikeSuccess?.();
    },
  });

  const handleUnlike = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!movie) return;

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
