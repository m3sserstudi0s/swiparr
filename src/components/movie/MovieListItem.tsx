"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Star, Calendar, HeartOff, Clock, Bookmark } from "lucide-react";
import { cn, ticksToTime } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { UserAvatarList } from "../session/UserAvatarList";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

import { MergedLike } from "@/types";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { useMovieActions } from "@/hooks/use-movie-actions";


interface MovieListItemProps {
  movie: MergedLike;
  onClick?: () => void;
  variant?: "full" | "condensed";
  isLiked?: boolean;
}


export function MovieListItem({ movie, onClick, variant = "full", isLiked }: MovieListItemProps) {
  const { capabilities, serverPublicUrl } = useRuntimeConfig();

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await apiClient.get<{ code: string | null; userId: string; isGuest?: boolean }>("/api/session");
      return res.data;
    },
  });

  const {
    movie: syncedMovie,
    isInList,
    isLikedByMe,
    isTogglingWatchlist,
    isUnliking,
    handleToggleWatchlist,
    handleUnlike,
    useWatchlist
  } = useMovieActions(movie, { isLiked });

  const currentMovie = syncedMovie || movie;

  const swipeDate = currentMovie.swipedAt ? new Date(currentMovie.swipedAt) : "";
  const formattedDate = swipeDate ? formatDistanceToNow(swipeDate, { addSuffix: true }) : "";
  const formattedDateText = formattedDate.substring(0, 1).toUpperCase() + formattedDate.substring(1);

  const isCondensed = variant === "condensed";

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex gap-4 mb-4 p-3 rounded-lg border transition-colors cursor-pointer bg-card border-border",
      )}
    >
      {/* Poster */}
      <div className={cn(
        isCondensed ? "relative shrink-0 w-15 h-22" : "relative shrink-0 w-20 h-28",
      )}>
        <OptimizedImage
          src={currentMovie.ImageTags?.Primary 
            ? `/api/media/image/${currentMovie.Id}?tag=${currentMovie.ImageTags?.Primary}`
            : `/api/media/image/${currentMovie.Id}`
          }
          alt={currentMovie.Name}
          externalId={currentMovie.Id}
          height={100}
          width={50}
          blurDataURL={currentMovie.BlurDataURL}
          className="w-full h-full object-cover rounded-md"
          sizes="(max-width: 768px) 75px, 100px"
        />
        {/* Match Indicator */}
        {!isCondensed && currentMovie.isMatch && (
          <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-[10px]">
            MATCH
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col justify-between flex-1 py-0.5 min-w-0">
        <div>
          <h3 className={cn(
            "font-bold line-clamp-2 leading-tight mb-1 text-foreground",
          )}>
            {currentMovie.Name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground h-6">
            <span>{currentMovie.ProductionYear}</span>
            {!!currentMovie.CommunityRating && '•'}
            {!!currentMovie.CommunityRating && (
              <span className="flex items-center">
                <Star className="size-2.5 mr-0.5 mb-0.5" />
                {currentMovie.CommunityRating.toFixed(1)}
              </span>
            )}
            •
            {!!currentMovie.RunTimeTicks && (
              <span className="flex items-center">
                <Clock className="size-2.5 mr-0.5 mb-0.5" /> {ticksToTime(currentMovie.RunTimeTicks)}
              </span>
            )}
            <div className="ml-auto">
              {currentMovie.sessionCode && currentMovie.likedBy && currentMovie.likedBy.length > 0 && (
                <UserAvatarList
                  users={currentMovie.likedBy}
                  size="sm"
                  className="translate-y-0.5 mr-1"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {/* Only show date in full view */}
          {currentMovie.swipedAt && (
            <div className="text-xs text-muted-foreground flex items-center">
              <Calendar className="size-2.5 mr-1 mb-0.5" />
              {formattedDateText}
            </div>
          )}

          <div className="flex gap-2">
            {capabilities.requiresServerUrl && <Link href={`${serverPublicUrl}/web/index.html#/details?id=${currentMovie.Id}&context=home`} onClick={e => e.stopPropagation()} className="flex-1">

              <Button
                size="sm"
                variant="secondary"
                className={cn(
                  "h-7 text-xs w-full",
                )}
              >
                <Play className={cn("mr-2 w-2 h-2")} />
                Play
              </Button>
            </Link>
            }
            {capabilities.hasStreamingSettings && <div className="flex flex-1 flex-row gap-2 items-center">
              {currentMovie.WatchProviders?.slice(0, 10).map((provider) => (
                <OptimizedImage
                  key={provider.Id}
                  src={`https://image.tmdb.org/t/p/w92${provider.LogoPath}`}
                  alt={provider.Name}
                  className="object-cover rounded-xs"
                  unoptimized
                  width={20}
                  height={20}
                />
              ))}
              {currentMovie.WatchProviders && currentMovie.WatchProviders.length > 10 && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  +{currentMovie.WatchProviders.length - 10}
                </span>
              )}
            </div>}
            {!sessionData?.isGuest && capabilities.hasWatchlist && (
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 w-7 p-0 text-muted-foreground hover:bg-muted",
                  isInList && "text-primary"
                )}
                onClick={handleToggleWatchlist}
                disabled={isTogglingWatchlist}
              >
                {useWatchlist ?
                  <Bookmark className={cn("w-4 h-4", isInList && "fill-foreground")} />
                  : <Star className={cn("w-4 h-4", isInList && "fill-foreground")} />
                }
              </Button>
            )}
            {(isLikedByMe || isLiked) && <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleUnlike}
              disabled={isUnliking}
            >
              <HeartOff className="w-3.5 h-3.5" />
            </Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
