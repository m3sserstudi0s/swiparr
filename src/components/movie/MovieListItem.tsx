"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Star, Calendar, HeartOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { UserAvatarList } from "../session/UserAvatarList";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { MergedLike } from "@/types/swiparr";

interface MovieListItemProps {
  movie: MergedLike;
  onClick?: () => void;
  variant?: "full" | "condensed";
}


export function MovieListItem({ movie, onClick, variant = "full" }: MovieListItemProps) {
  const queryClient = useQueryClient();

  const { mutate: relike } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/swipe", {
        itemId: movie.Id,
        direction: "right"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
    }
  });

  const { mutate: unlike, isPending } = useMutation({
    mutationFn: async () => {
      const sessionParam = movie.sessionCode ? `&sessionCode=${movie.sessionCode}` : "";
      await axios.delete(`/api/user/likes?itemId=${movie.Id}${sessionParam}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
      toast('Movie removed from likes', {
        action: {
          label: 'Undo',
          onClick: () => relike()
        },
      });
    },
    onError: () => {
      toast.error("Failed to remove from likes");
    }
  });

  const swipeDate = movie.swipedAt ? new Date(movie.swipedAt) : "";
  const formattedDate = swipeDate ? formatDistanceToNow(swipeDate, { addSuffix: true }) : "";
  const formattedDateText = formattedDate.substring(0, 1).toUpperCase() + formattedDate.substring(1);

  const jellyfinUrl = process.env.NEXT_PUBLIC_JELLYFIN_PUBLIC_URL;

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
        isCondensed ? "relative shrink-0 w-15 h-20" : "relative shrink-0 w-20 h-28",
      )}>
        <OptimizedImage
          src={`/api/jellyfin/image/${movie.Id}`}
          alt={movie.Name}
          className="w-full h-full object-cover rounded-md"
        />
        {/* Match Indicator */}
        {!isCondensed && movie.isMatch && (
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
            {movie.Name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground h-6">
            <span>{movie.ProductionYear}</span>
            •
            {movie.CommunityRating && (
              <span className="flex items-center">
                <Star className="w-3 h-3 mr-0.5" />
                {movie.CommunityRating.toFixed(1)}
              </span>
            )}
            {movie.likedBy && movie.likedBy.length > 0 && (
                <UserAvatarList 
                    users={movie.likedBy} 
                    size="sm" 
                    className="ml-auto translate-y-0.5 mr-1" 
                />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {/* Only show date in full view */}
          {movie.swipedAt && (
            <div className="text-xs text-muted-foreground flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formattedDateText}
            </div>
          )}
          
          <div className="flex gap-2">
            <Link href={`${jellyfinUrl}/web/index.html#/details?id=${movie.Id}&context=home`} target="_blank" onClick={e => e.stopPropagation()} className="flex-1">
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
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                unlike();
              }}
              disabled={isPending}
            >
              <HeartOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
