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
import { Filters } from "@/types";
import { RotateCcw, Star, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { useFilters, useSession, useWatchProviders, useUserSettings } from "@/hooks/api";
import { MediaGenre, MediaRating, MediaYear, WatchProvider } from "@/types/media";
import { OptimizedImage } from "../ui/optimized-image";
import { UserAvatarList } from "../session/UserAvatarList";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: Filters;
  onSave: (filters: Filters) => void;
}

export function FilterDrawer({ open, onOpenChange, currentFilters, onSave }: FilterDrawerProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedWatchProviders, setSelectedWatchProviders] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [runtimeRange, setRuntimeRange] = useState<[number, number]>([0, 240]);
  const [minRating, setMinRating] = useState<number>(0);
  
  const { data: session } = useSession();
  const { provider: runtimeProvider } = useRuntimeConfig();
  const activeProvider = session?.provider || runtimeProvider;

  const { data: userSettings, isLoading: isLoadingSettings } = useUserSettings();
  const { genres, years, ratings, isLoading } = useFilters(open);

  const { data: watchProvidersData, isLoading: isLoadingProviders } = useWatchProviders(
    userSettings?.watchRegion || "SE",
    session?.code
  );

  const availableWatchProviders = watchProvidersData?.providers || [];
  const members = watchProvidersData?.members || [];

  const formatRuntime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
  };


  const initialFiltersRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  const minYearLimit = useMemo(() => {
    if (!years || years.length === 0) return 1900;
    const yearNums = years.map((y: MediaYear) => y.Value).filter((n) => !isNaN(n));
    return yearNums.length > 0 ? Math.min(...yearNums) : 1900;
  }, [years]);

  const maxYearLimit = useMemo(() => {
    if (!years || years.length === 0) return new Date().getFullYear();
    const yearNums = years.map((y: MediaYear) => y.Value).filter((n) => !isNaN(n));
    return yearNums.length > 0 ? Math.max(...yearNums) : new Date().getFullYear();
  }, [years]);

  useEffect(() => {
    if (open && !isLoading) {
      const genresList = currentFilters?.genres || [];
      const officialRatings = currentFilters?.officialRatings || [];
      const watchProviders = currentFilters?.watchProviders || availableWatchProviders.map(p => p.Id);
      const yearRange = currentFilters?.yearRange || [minYearLimit, maxYearLimit];
      const runtimeRange = currentFilters?.runtimeRange || [0, 240];
      const minCommunityRating = currentFilters?.minCommunityRating || 0;

      setSelectedGenres(genresList);
      setSelectedRatings(officialRatings);
      setSelectedWatchProviders(watchProviders);
      setYearRange(yearRange);
      setRuntimeRange(runtimeRange);
      setMinRating(minCommunityRating);

      // Store a normalized version of currentFilters for comparison
      const normalizedInitial = {
        genres: genresList,
        officialRatings,
        watchProviders,
        yearRange: currentFilters?.yearRange,
        runtimeRange: currentFilters?.runtimeRange,
        minCommunityRating: minCommunityRating > 0 ? minCommunityRating : undefined
      };
      initialFiltersRef.current = JSON.stringify(normalizedInitial);
      hasInitializedRef.current = true;
    }
  }, [open, isLoading, minYearLimit, maxYearLimit, currentFilters, availableWatchProviders]);

  useEffect(() => {
    if (!open && hasInitializedRef.current) {
      const isYearDefault = yearRange[0] === minYearLimit && yearRange[1] === maxYearLimit;
      const isRuntimeDefault = runtimeRange[0] === 0 && runtimeRange[1] === 240;

      const newFilters: Filters = {
        genres: selectedGenres,
        officialRatings: selectedRatings,
        watchProviders: selectedWatchProviders,
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
  }, [open, minYearLimit, maxYearLimit, onSave, selectedGenres, selectedRatings, selectedWatchProviders, yearRange, runtimeRange, minRating]);


  const toggleGenre = (genreName: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreName)
        ? prev.filter((g) => g !== genreName)
        : [...prev, genreName]
    );
  };

  const toggleRating = (rating: string) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? [] : [rating]
    );
  };

  const toggleWatchProvider = (id: string) => {
    setSelectedWatchProviders((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };

  const selectAllGenres = () => setSelectedGenres(genres.map(g => g.Name));
  const deselectAllGenres = () => setSelectedGenres([]);
  
  const selectAllProviders = () => setSelectedWatchProviders(availableWatchProviders.map(p => p.Id));
  const deselectAllProviders = () => setSelectedWatchProviders([]);

  const resetAll = () => {
    setSelectedGenres([]);
    setSelectedRatings([]);
    setSelectedWatchProviders(availableWatchProviders.map(p => p.Id));
    setYearRange([minYearLimit, maxYearLimit]);
    setRuntimeRange([0, 240]);
    setMinRating(0);
  };

  if (isLoading) {

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
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">
                  Genres
                </Label>
                <div className="flex gap-2">
                    <button onClick={selectAllGenres} className="text-sm cursor-pointer font-medium text-primary hover:underline">Select all</button>
                    <button onClick={deselectAllGenres} className="text-sm cursor-pointer font-medium text-muted-foreground hover:underline">Clear</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {genres?.map((genre: MediaGenre) => (
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

            {/* Watch Providers Section */}
            {activeProvider === "tmdb" && availableWatchProviders.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">
                    Streaming Services
                    </Label>
                    <div className="flex gap-2">
                        <button onClick={selectAllProviders} className="text-sm cursor-pointer font-medium text-primary hover:underline">Select all</button>
                        <button onClick={deselectAllProviders} className="text-sm cursor-pointer font-medium text-muted-foreground hover:underline">Clear</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availableWatchProviders.map((p: WatchProvider & { MemberUserIds?: string[] }) => {
                    const isSelected = selectedWatchProviders.includes(p.Id);
                    const providerMembers = (p.MemberUserIds || [])
                      .map(id => {
                        const m = members.find(m => m.externalUserId === id);
                        if (!m) return null;
                        return { userId: m.externalUserId, userName: m.externalUserName };
                      })
                      .filter(Boolean) as { userId: string, userName: string }[];

                    return (
                      <button
                        key={p.Id}
                        onClick={() => toggleWatchProvider(p.Id)}
                        className={cn(
                          "relative flex items-center gap-2 p-3 rounded-xl border transition-all text-left group",
                          isSelected
                            ? "bg-primary/5 border-primary text-primary shadow-sm"
                            : "bg-background hover:bg-muted/50 border-input text-muted-foreground"
                        )}
                      >
                        <div className="relative size-8 shrink-0 rounded-lg overflow-hidden border group-hover:scale-105 transition-transform">
                          <OptimizedImage
                            src={`https://image.tmdb.org/t/p/w92${p.LogoPath}`}
                            alt={p.Name}
                            className="object-cover"
                            unoptimized
                            width={32}
                            height={32}
                          />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-medium truncate">{p.Name}</span>
                          {providerMembers.length > 0 && (
                            <UserAvatarList 
                              users={providerMembers.map(m => ({ userId: m.userId, userName: m.userName }))} 
                              size="sm" 
                              className="mt-1"
                            />
                          )}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                            <Check className="size-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Official Ratings Section */}
            {ratings && ratings.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">
                    Maturity Rating
                    </Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ratings.map((rating: MediaRating) => (
                    <Badge
                      key={rating.Value}
                      variant={selectedRatings.includes(rating.Value) ? "default" : "outline"}
                      className="cursor-pointer text-sm py-2 px-4 rounded-full transition-colors"
                      onClick={() => toggleRating(rating.Value)}
                    >
                      {rating.Name}
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
              Reset all
            </Button>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
