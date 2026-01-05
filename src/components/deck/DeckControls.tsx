import React from "react";
import { Button } from "@/components/ui/button";
import { Heart, X, Rewind, SlidersHorizontal } from "lucide-react";
import { Badge } from "../ui/badge";

interface DeckControlsProps {
  onRewind: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onOpenFilter: () => void;
  canRewind: boolean;
  hasAppliedFilters: boolean;
  leftSwipesRemaining?: number;
  rightSwipesRemaining?: number;
}

export function DeckControls({
  onRewind,
  onSwipeLeft,
  onSwipeRight,
  onOpenFilter,
  canRewind,
  hasAppliedFilters,
  leftSwipesRemaining,
  rightSwipesRemaining,
}: DeckControlsProps) {
  return (
    <div className="flex space-x-6 z-1 mt-4 items-center">
      <Button
        size="icon"
        variant="secondary"
        className="h-12 w-12 rounded-full bg-background border-2"
        onClick={onRewind}
        disabled={!canRewind}
      >
        <Rewind className="size-5.5" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="h-18 w-18 rounded-full bg-background border-2 relative"
        onClick={onSwipeLeft}
      >
        <X className="size-9" />
        {leftSwipesRemaining !== undefined && (
          <Badge variant='secondary' className="rounded-full absolute -top-2 -right-2">
            {leftSwipesRemaining}
          </Badge>
        )}
      </Button>
      <Button
        size="icon"
        className="h-18 w-18 rounded-full shadow-lg relative"
        onClick={onSwipeRight}
      >
        <Heart className="size-9 fill-primary-foreground" />
        {rightSwipesRemaining !== undefined && (
          <Badge variant='secondary' className="rounded-full absolute -top-2 -right-2">
            {rightSwipesRemaining}
          </Badge>
        )}
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-12 w-12 rounded-full bg-background border-2 relative"
        onClick={onOpenFilter}
      >
        <SlidersHorizontal className="size-5.5" />
        {hasAppliedFilters && (
          <span className="rounded-full bg-foreground absolute top-0 right-0 size-3.5 border-2 border-background animate-in zoom-in duration-300" />
        )}
      </Button>
    </div>
  );
}
