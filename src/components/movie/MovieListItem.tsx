"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Star, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { OptimizedImage } from "@/components/ui/optimized-image";

import { MergedLike } from "@/types/swiparr";

interface MovieListItemProps {
  movie: MergedLike;
  onClick?: () => void;
  variant?: "full" | "condensed";
}


export function MovieListItem({ movie, onClick, variant = "full" }: MovieListItemProps) {
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{movie.ProductionYear}</span>
            •
            {movie.CommunityRating && (
              <span className="flex items-center">
                <Star className="w-3 h-3 mr-0.5" />
                {movie.CommunityRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {/* Only show date in full view */}
          {movie.swipedAt && (
            <div className="text-[10px] text-muted-foreground flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formattedDateText}
            </div>
          )}
          
          <Link href={`${jellyfinUrl}/web/index.html#/details?id=${movie.Id}&context=home`} target="_blank" onClick={e => e.stopPropagation()}>
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
        </div>
      </div>
    </div>
  );
}