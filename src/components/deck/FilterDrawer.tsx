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
import { Filters } from "@/types/swiparr";
import { RotateCcw, Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "../ui/skeleton";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { DEFAULT_GENRES, DEFAULT_RATINGS } from "@/lib/constants";

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: Filters;
  onSave: (filters: Filters) => void;
}

export function FilterDrawer({ open, onOpenChange, currentFilters, onSave }: FilterDrawerProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [runtimeRange, setRuntimeRange] = useState<[number, number]>([0, 240]);
  const [minRating, setMinRating] = useState<number>(0);
  const { useStaticFilterValues } = useRuntimeConfig();

  const formatRuntime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
  };


  const initialFiltersRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  // Fetch available years to determine min/max
  const { data: years, isLoading: isLoadingYears } = useQuery({
    queryKey: ["years"],
    queryFn: async () => {
      if (useStaticFilterValues) {
        return Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => ({ Name: (1900 + i).toString() }));
      }
      const res = await apiClient.get("/api/jellyfin/years");
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const minYearLimit = useMemo(() => {
    if (useStaticFilterValues) return 1900;
    if (!years || years.length === 0) return 1900;
    const yearNums = years.map((y: any) => parseInt(y.Name)).filter((n: any) => !isNaN(n));
    return yearNums.length > 0 ? Math.min(...yearNums) : 1900;
  }, [years, useStaticFilterValues]);

  const maxYearLimit = useMemo(() => {
    if (useStaticFilterValues) return new Date().getFullYear();
    if (!years || years.length === 0) return new Date().getFullYear();
    const yearNums = years.map((y: any) => parseInt(y.Name)).filter((n: any) => !isNaN(n));
    return yearNums.length > 0 ? Math.max(...yearNums) : new Date().getFullYear();
  }, [years, useStaticFilterValues]);

  // Fetch available genres
  const { data: genres, isLoading: isLoadingGenres } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      if (useStaticFilterValues) return DEFAULT_GENRES;
      const res = await apiClient.get("/api/jellyfin/genres");
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Fetch available ratings
  const { data: ratings, isLoading: isLoadingRatings } = useQuery({
    queryKey: ["ratings"],
    queryFn: async () => {
      if (useStaticFilterValues) return DEFAULT_RATINGS;
      const res = await apiClient.get("/api/jellyfin/ratings");
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  useEffect(() => {
    if (open && !isLoadingYears) {
      const genres = currentFilters?.genres || [];
      const officialRatings = currentFilters?.officialRatings || [];
      const yearRange = currentFilters?.yearRange || [minYearLimit, maxYearLimit];
      const runtimeRange = currentFilters?.runtimeRange || [0, 240];
      const minCommunityRating = currentFilters?.minCommunityRating || 0;

      setSelectedGenres(genres);
      setSelectedRatings(officialRatings);
      setYearRange(yearRange);
      setRuntimeRange(runtimeRange);
      setMinRating(minCommunityRating);

      // Store a normalized version of currentFilters for comparison
      const normalizedInitial = {
        genres,
        officialRatings,
        yearRange: currentFilters?.yearRange,
        runtimeRange: currentFilters?.runtimeRange,
        minCommunityRating: minCommunityRating > 0 ? minCommunityRating : undefined
      };
      initialFiltersRef.current = JSON.stringify(normalizedInitial);
      hasInitializedRef.current = true;
    }
  }, [open, isLoadingYears, minYearLimit, maxYearLimit, currentFilters]);

  useEffect(() => {
    if (!open && hasInitializedRef.current) {
      const isYearDefault = yearRange[0] === minYearLimit && yearRange[1] === maxYearLimit;
      const isRuntimeDefault = runtimeRange[0] === 0 && runtimeRange[1] === 240;

      const newFilters: Filters = {
        genres: selectedGenres,
        officialRatings: selectedRatings,
        yearRange: isYearDefault ? undefined : yearRange,
        runtimeRange: isRuntimeDefault ? undefined : runtimeRange,
        minCommunityRating: minRating > 0 ? minRating : undefined
      };

      if (JSON.stringify(newFilters) !== initialFiltersRef.current) {
        onSave(newFilters);
      }
      hasInitializedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, minYearLimit, maxYearLimit, onSave, selectedGenres, selectedRatings, yearRange, runtimeRange, minRating]);


  const toggleGenre = (genreName: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreName)
        ? prev.filter((g) => g !== genreName)
        : [...prev, genreName]
    );
  };

  const toggleRating = (rating: string) => {
    setSelectedRatings((prev) =>
      prev.includes(rating)
        ? prev.filter((r) => r !== rating)
        : [...prev, rating]
    );
  };

  const resetAll = () => {
    setSelectedGenres([]);
    setSelectedRatings([]);
    setYearRange([minYearLimit, maxYearLimit]);
    setRuntimeRange([0, 240]);
    setMinRating(0);
  };

  if (isLoadingYears || isLoadingGenres || isLoadingRatings) {

    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[66vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 px-6 py-6 space-y-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-12 w-full" />
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
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 h-[50vh]">
          <div className="flex flex-col gap-8 pt-8 pb-12 px-6">

            {/* Rating Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">
                  Rating
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
                <Label className="text-base font-semibold">
                  Release
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

            {/* Runtime Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">
                  Runtime
                </Label>
                <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {formatRuntime(runtimeRange[0])} — {runtimeRange[1] === 240 ? `${formatRuntime(240)}+` : formatRuntime(runtimeRange[1])}
                </span>
              </div>
              <div className="px-2">
                <Slider
                  value={runtimeRange}
                  min={0}
                  max={240}
                  step={5}
                  onValueChange={(val) => setRuntimeRange(val as [number, number])}
                  className="py-4"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{formatRuntime(0)}</span>
                <span>{formatRuntime(240)}+</span>
              </div>
            </div>

            {/* Genres Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Genres
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

            {/* Official Ratings Section */}
            {ratings && ratings.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Maturity Ratings
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ratings.map((rating: string) => (
                    <Badge
                      key={rating}
                      variant={selectedRatings.includes(rating) ? "default" : "outline"}
                      className="cursor-pointer text-sm py-2 px-4 rounded-full transition-colors"
                      onClick={() => toggleRating(rating)}
                    >
                      {rating}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              onClick={resetAll}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
