"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Filters } from "@/types/swiparr";
import { RotateCcw, Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: Filters;
  onSave: (filters: Filters) => void;
}

export function FilterDrawer({ open, onOpenChange, currentFilters, onSave }: FilterDrawerProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [minRating, setMinRating] = useState<number>(0);

  const lastSavedFiltersRef = useRef<string>(JSON.stringify(currentFilters));
  const hasInitializedRef = useRef(false);

  // Fetch available years to determine min/max
  const { data: years, isLoading: isLoadingYears } = useQuery({
    queryKey: ["years"],
    queryFn: async () => {
      const res = await axios.get("/api/jellyfin/years");
      return res.data;
    },
    enabled: open,
  });

  const minYearLimit = useMemo(() => {
    if (!years || years.length === 0) return 1900;
    const yearNums = years.map((y: any) => parseInt(y.Name)).filter((n: any) => !isNaN(n));
    return Math.min(...yearNums);
  }, [years]);

  const maxYearLimit = useMemo(() => {
    if (!years || years.length === 0) return new Date().getFullYear();
    const yearNums = years.map((y: any) => parseInt(y.Name)).filter((n: any) => !isNaN(n));
    return Math.max(...yearNums);
  }, [years]);

  // Fetch available genres
  const { data: genres, isLoading: isLoadingGenres } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const res = await axios.get("/api/jellyfin/genres");
      return res.data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (!hasInitializedRef.current && !isLoadingYears) {
        setSelectedGenres(currentFilters?.genres || []);
        setYearRange(currentFilters?.yearRange || [minYearLimit, maxYearLimit]);
        setMinRating(currentFilters?.minCommunityRating || 0);
        lastSavedFiltersRef.current = JSON.stringify(currentFilters);
        hasInitializedRef.current = true;
      }
    } else {
      if (hasInitializedRef.current) {
        // Only save if we actually had valid limits to compare against
        const isYearDefault = !isLoadingYears && yearRange[0] === minYearLimit && yearRange[1] === maxYearLimit;
        const newFilters: Filters = {
          genres: selectedGenres,
          yearRange: isYearDefault ? undefined : yearRange,
          minCommunityRating: minRating > 0 ? minRating : undefined
        };
        if (JSON.stringify(newFilters) !== lastSavedFiltersRef.current) {
          onSave(newFilters);
        }
        hasInitializedRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, minYearLimit, maxYearLimit]);

  const toggleGenre = (genreName: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreName)
        ? prev.filter((g) => g !== genreName)
        : [...prev, genreName]
    );
  };

  const resetAll = () => {
    setSelectedGenres([]);
    setYearRange([minYearLimit, maxYearLimit]);
    setMinRating(0);
  };

  if (isLoadingYears || isLoadingGenres) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[66vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 px-6 py-6 space-y-8 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 w-24 bg-muted rounded-xl" />
                <div className="h-12 w-full bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[66vh] flex flex-col">
        <DrawerHeader className="border-b pb-4 shrink-0">
          <DrawerTitle>
            Filters
            <Button
              size={'icon'}
              className="size-6 ml-2"
              variant={'outline'}
              onClick={resetAll}
            >
              <RotateCcw className="size-3" />
            </Button>
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 h-[50vh]">
          <div className="flex flex-col gap-8 py-6 pb-12 px-6">

            {/* Rating Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold flex items-center gap-2">
                  Rating
                  <Button
                    size={'icon'}
                    className="size-6"
                    variant={'outline'}
                    onClick={() => setMinRating(0)}
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                </Label>
                <span className="text-sm font-medium text-muted-foreground">
                  {minRating > 0 ? `At least ${minRating} stars` : "Any rating"}
                </span>
              </div>
              <div className="flex gap-1.5 justify-between">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setMinRating(star === minRating ? 0 : star)}
                    className="focus:outline-none transition-transform active:scale-90"
                  >
                    <Star
                      className={`size-7 ${star <= minRating
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground/30"
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Release Section (Years) */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold flex items-center gap-2">
                  Release
                  <Button
                    size={'icon'}
                    className="size-6"
                    variant={'outline'}
                    onClick={() => setYearRange([minYearLimit, maxYearLimit])}
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                </Label>
                <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {yearRange[0]} — {yearRange[1]}
                </span>
              </div>
              <div className="px-2">
                <Slider
                  value={yearRange}
                  min={minYearLimit}
                  max={maxYearLimit}
                  step={1}
                  onValueChange={(val) => setYearRange(val as [number, number])}
                  className="py-4"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{minYearLimit}</span>
                <span>{maxYearLimit}</span>
              </div>
            </div>

            {/* Genres Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                Genres
                <Button
                  size={'icon'}
                  className="size-6"
                  variant={'outline'}
                  onClick={() => setSelectedGenres([])}
                >
                  <RotateCcw className="size-3" />
                </Button>
              </Label>
              <div className="flex flex-wrap gap-2">
                {genres?.map((genre: { Id: string; Name: string }) => (
                  <Badge
                    key={genre.Id}
                    variant={selectedGenres.includes(genre.Name) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-2 px-4 rounded-full transition-colors"
                    onClick={() => toggleGenre(genre.Name)}
                  >
                    {genre.Name}
                  </Badge>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
