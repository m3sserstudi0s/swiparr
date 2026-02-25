"use client";
import React, { forwardRef, useRef, memo } from "react";

import { MediaItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Percent } from "lucide-react";
import { Direction, FramerTinderCard, TinderCardHandle } from "./FrameTinderCard";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { cn, ticksToTime } from "@/lib/utils";


export type { TinderCardHandle };


interface SwipeCardProps {
  item: MediaItem;
  index: number;
  onSwipe: (id: string, direction: "left" | "right") => void;
  onCardLeftScreen: (id: string, direction: "left" | "right") => void;
  onClick?: () => void;
  preventSwipe?: Direction[];
}

export const SwipeCard = memo(forwardRef<TinderCardHandle, SwipeCardProps>(
  function SwipeCard({ item, index, onSwipe, onCardLeftScreen, onClick, preventSwipe = [] }, ref) {

    const isFront = index === 0;

    // Track the start position of the click/touch

    const clickCoords = useRef<{ x: number; y: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
      clickCoords.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (!clickCoords.current) return;

      // Calculate distance moved
      const diffX = Math.abs(e.clientX - clickCoords.current.x);
      const diffY = Math.abs(e.clientY - clickCoords.current.y);

      // 3. Only trigger onClick if the pointer moved less than 5 pixels
      if (diffX < 5 && diffY < 5 && onClick) {
        onClick();
      }

      clickCoords.current = null;
    };

    const ratingSource = item.CommunityRatingSource?.toLowerCase();
    const isRottenTomatoes = ratingSource?.includes("rottentomatoes") || ratingSource?.includes("tomato");
    const ratingDisplay = typeof item.CommunityRating === "number"
      ? (isRottenTomatoes ? Math.round(item.CommunityRating * 10) : item.CommunityRating.toFixed(1))
      : null;

    return (
      // 1. Outer Container: Positions the slot in the center of the deck
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 3 - index }}
      >
        {/* 2. Motion Component: Needs to be absolute to stack perfectly */}
        <FramerTinderCard
          ref={ref}
          preventSwipe={[...preventSwipe, "up", "down"]}
          swipeThreshold={100}
          onSwipe={(dir) => {
            // Filter out 'up'/'down' before calling parent
            if (dir === "left" || dir === "right") {
              onSwipe(item.Id, dir);
            }
          }}
          onCardLeftScreen={(dir) => {
             if (dir === "left" || dir === "right") {
               onCardLeftScreen(item.Id, dir);
             }
          }}
          // 3. Important: absolute positioning + width constraint
          className={`absolute w-full h-[68svh] rounded-3xl ${isFront ? "cursor-grab pointer-events-auto" : ""}`}
        >
          {/* 4. Scale Wrapper: Handles the background card "stack" effect */}
          <div
            className={`w-full h-full transition-transform duration-300 rounded-3xl ${isFront ? "scale-100" : "scale-95"
              }`}
            onPointerDown={isFront ? handlePointerDown : undefined}
            onPointerUp={isFront ? handlePointerUp : undefined}
          >
            <Card className={cn("relative h-full w-full overflow-hidden rounded-3xl border-border select-none isolate transform-gpu", isFront && "shadow-xl")}>
              <div className="absolute inset-0 bg-muted pointer-events-none rounded-3xl">
                <OptimizedImage
                  src={item.ImageTags?.Primary 
                    ? `/api/media/image/${item.Id}?tag=${item.ImageTags?.Primary}`
                    : `/api/media/image/${item.Id}`
                  }
                  alt={item.Name}
                  externalId={item.Id}
                  blurDataURL={item.BlurDataURL}
                  loading={index == 0 ? 'eager' : undefined}
                  className="h-full w-full object-cover rounded-3xl"
                  draggable={false} // Native drag must be disabled
                  height={700}
                  width={500}
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
              </div>

              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 p-6 text-foreground w-full select-none pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-3xl font-bold leading-tight shadow-background drop-shadow-md text-neutral-100">
                    {item.Name}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {!!item.Genres?.[0] && (
                    <Badge
                      variant="secondary"
                      className="text-neutral-100 text-xs/0 bg-primary/20 border border-primary/10 hover:bg-primary/30"
                    >
                      {item.Genres[0]}
                    </Badge>
                  )}
                  {!!item.ProductionYear && (
                    <Badge
                      variant="secondary"
                      className="bg-neutral-600/70 text-xs/0 hover:bg-accent text-neutral-100 border-0 flex"
                    >
                      {item.ProductionYear}
                    </Badge>
                  )}
                  {!!item.CommunityRating && ratingDisplay !== null && (
                    <Badge variant="outline" className="gap-1 text-xs/0 border-neutral-700/70 bg-neutral-700/20 text-neutral-100">
                      {isRottenTomatoes ? <Percent className="w-3 h-3 mb-px" /> : <Star className="w-3 h-3 fill-neutral-100 mb-px" />}
                      {ratingDisplay}{isRottenTomatoes ? "%" : ""}
                    </Badge>
                  )}
                   {!!item.RunTimeTicks && (
                    <Badge variant="outline" className="gap-1 text-xs/0 border-neutral-700/70 bg-neutral-700/20 text-neutral-100">
                      <Clock className="w-3 h-3 mb-px" />
                      {ticksToTime(item.RunTimeTicks)}
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-3 text-sm text-neutral-400">
                  {item.Overview}
                </p>
              </div>

            </Card>
          </div>
        </FramerTinderCard>
      </div>
    );
  }
));
