"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { Switch } from "../ui/switch";
import { useFilters, useThemes, useSession, useWatchProviders, useUserSettings } from "@/hooks/api";
import { MediaGenre, MediaRating, MediaYear, WatchProvider } from "@/types/media";
import { OptimizedImage } from "../ui/optimized-image";
import { UserAvatarList } from "../session/UserAvatarList";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";
import { LANGUAGES, DEFAULT_LANGUAGES, SORT_OPTIONS } from "@/lib/constants";

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
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(DEFAULT_LANGUAGES);
  const [sortBy, setSortBy] = useState<string>("Trending");
  const [unplayedOnly, setUnplayedOnly] = useState<boolean>(true);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [runtimeRange, setRuntimeRange] = useState<[number, number]>([0, 240]);
  const [minRating, setMinRating] = useState<number>(0);

  const { data: session } = useSession();
  const defaultSort = session?.provider === 'tmdb' ? "Popular" : "Trending"; // Popular works better with TMDB
  const { capabilities } = useRuntimeConfig();
  const { data: userSettings } = useUserSettings();
  const watchRegion = session?.provider === 'tmdb' ? (userSettings?.watchRegion || "SE") : undefined;

  const { genres, years, ratings, isLoading: isLoadingFilters } = useFilters(open, watchRegion);
  const { data: themes = [], isLoading: isLoadingThemes } = useThemes(open);
  const { data: watchProvidersData, isLoading: isLoadingProviders } = useWatchProviders(
    watchRegion,
    session?.code
  );

  const availableWatchProviders = watchProvidersData?.providers || [];
  const members = watchProvidersData?.members || [];
  const isLoading = isLoadingFilters || isLoadingThemes || isLoadingProviders;

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


  const sortOptions = useMemo(() => {
    return [
      defaultSort,
      ...SORT_OPTIONS.filter(option => option !== defaultSort)
    ];
  }, [defaultSort]);

  useEffect(() => {
    if (open) {
      setSelectedGenres(currentFilters?.genres || []);
      setSelectedRatings(currentFilters?.officialRatings || []);
      setSelectedWatchProviders(currentFilters?.watchProviders || availableWatchProviders.map(p => p.Id));
      setSelectedThemes(currentFilters?.themes || []);
      setSelectedLanguages(currentFilters?.languages || DEFAULT_LANGUAGES);
      setSortBy(currentFilters?.sortBy || defaultSort);
      setUnplayedOnly(currentFilters?.unplayedOnly ?? true);
      setYearRange(currentFilters?.yearRange || [minYearLimit, maxYearLimit]);
      setRuntimeRange(currentFilters?.runtimeRange || [0, 240]);
      setMinRating(currentFilters?.minCommunityRating || 0);
    }
  }, [open, currentFilters, availableWatchProviders, minYearLimit, maxYearLimit, defaultSort]);

  const normalizeFilters = (f: Filters): Filters => {
    const isYearDefault = !f.yearRange || (f.yearRange[0] === minYearLimit && f.yearRange[1] === maxYearLimit);
    const isRuntimeDefault = !f.runtimeRange || (f.runtimeRange[0] === 0 && f.runtimeRange[1] === 240);
    const isLanguageDefault = !f.languages || (f.languages.length === DEFAULT_LANGUAGES.length &&
      f.languages.every(l => DEFAULT_LANGUAGES.includes(l)));

    // Logic: 
    // - If all providers are selected OR none are selected, we treat it as "no filter" (undefined)
    // - If a specific subset is selected, we send the explicit list
    const isWatchProvidersDefault = !f.watchProviders ||
      f.watchProviders.length === 0 ||
      f.watchProviders.length === availableWatchProviders.length;

    return {
      genres: f.genres?.length ? f.genres : [],
      officialRatings: f.officialRatings?.length ? f.officialRatings : undefined,
      watchProviders: isWatchProvidersDefault ? undefined : f.watchProviders,
      themes: f.themes?.length ? f.themes : undefined,
      languages: isLanguageDefault ? undefined : f.languages,
      sortBy: (f.sortBy === defaultSort || !f.sortBy) ? undefined : f.sortBy,
      unplayedOnly: f.unplayedOnly ?? true,
      yearRange: isYearDefault ? undefined : f.yearRange,
      runtimeRange: isRuntimeDefault ? undefined : f.runtimeRange,
      minCommunityRating: (f.minCommunityRating && f.minCommunityRating > 0) ? f.minCommunityRating : undefined
    };
  };

  const getCurrentFiltersObject = (): Filters => {
    return normalizeFilters({
      genres: selectedGenres,
      officialRatings: selectedRatings,
      watchProviders: selectedWatchProviders,
      themes: selectedThemes,
      languages: selectedLanguages,
      sortBy: sortBy,
      unplayedOnly: unplayedOnly,
      yearRange: yearRange,
      runtimeRange: runtimeRange,
      minCommunityRating: minRating
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      const newFilters = getCurrentFiltersObject();
      const currentFiltersNorm = normalizeFilters(currentFilters);

      if (JSON.stringify(newFilters) !== JSON.stringify(currentFiltersNorm)) {
        onSave(newFilters);
      }
    }
    onOpenChange(newOpen);
  };

  const formatRuntime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const resetAll = () => {
    setSelectedGenres([]);
    setSelectedRatings([]);
    setSelectedWatchProviders(availableWatchProviders.map(p => p.Id));
    setSelectedThemes([]);
    setSelectedLanguages(DEFAULT_LANGUAGES);
    setSortBy(defaultSort);
    setUnplayedOnly(true);
    setYearRange([minYearLimit, maxYearLimit]);
    setRuntimeRange([0, 240]);
    setMinRating(0);
  };

  const isSession = !!session?.code;
  const filteredSortOptions = isSession
    ? sortOptions.filter(opt => opt !== "Random")
    : sortOptions;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="h-[66vh] flex flex-col">
        <DrawerHeader className="border-b pb-4 shrink-0 relative">
          <DrawerTitle className="text-center w-full">
            Filters
          </DrawerTitle>
          <Button
            variant="ghost"
            size='sm'
            className="h-8 gap-2 text-muted-foreground hover:text-foreground text-xs absolute right-4 top-4"
            onClick={resetAll}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-8 pt-6 pb-12 px-6">
            {isLoading ? (
              <div className="space-y-10">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Sort Section */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {filteredSortOptions.map((option) => (
                      <Badge
                        key={option}
                        variant={sortBy === option ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1.5 px-4 rounded-full transition-colors"
                        onClick={() => setSortBy(option)}
                      >
                        {option}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Watched Section */}
                {capabilities.hasAuth && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold tracking-tight">Hide Watched</Label>
                      <p className="text-xs text-muted-foreground font-medium">Only show items you haven't seen yet</p>
                    </div>
                    <Switch
                      checked={unplayedOnly}
                      onCheckedChange={setUnplayedOnly}
                    />
                  </div>
                )}

                {/* Rating Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Community Rating</Label>
                    <span className="text-sm font-medium text-primary">
                      {minRating > 0 ? `${minRating}+ Stars` : "Any"}
                    </span>
                  </div>
                  <div className="flex gap-1 justify-between">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                      <button
                        key={star}
                        onClick={() => setMinRating(star === minRating ? 0 : star)}
                        className="focus:outline-none transition-transform active:scale-90"
                      >
                        <Star
                          className={cn(
                            "size-6 transition-colors",
                            star <= minRating ? "fill-primary text-primary" : "text-muted-foreground/30"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Release Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Release Year</Label>
                    <Badge variant="secondary" className="font-mono">
                      {yearRange[0]} — {yearRange[1]}
                    </Badge>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={yearRange}
                      min={minYearLimit}
                      max={maxYearLimit}
                      step={1}
                      onValueChange={(val) => setYearRange(val as [number, number])}
                    />
                  </div>
                </div>

                {/* Runtime Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Runtime</Label>
                    <Badge variant="secondary" className="font-mono">
                      {formatRuntime(runtimeRange[0])} — {runtimeRange[1] === 240 ? "4:00+" : formatRuntime(runtimeRange[1])}
                    </Badge>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={runtimeRange}
                      min={0}
                      max={240}
                      step={5}
                      onValueChange={(val) => setRuntimeRange(val as [number, number])}
                    />
                  </div>
                </div>

                {/* Genres Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Genres</Label>
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedGenres(genres.map(g => g.Name))} className="text-xs font-semibold cursor-pointer text-primary hover:underline">Select all</button>
                      <button onClick={() => setSelectedGenres([])} className="text-xs font-semibold cursor-pointer text-muted-foreground hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {genres?.map((genre: MediaGenre) => (
                      <Badge
                        key={genre.Id}
                        variant={selectedGenres.includes(genre.Name) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1.5 px-4 rounded-full"
                        onClick={() => setSelectedGenres(prev => prev.includes(genre.Name) ? prev.filter(g => g !== genre.Name) : [...prev, genre.Name])}
                      >
                        {genre.Name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Themes Section */}
                {themes.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Themes</Label>
                    <div className="flex flex-wrap gap-2">
                      {themes.map((theme: string) => (
                        <Badge
                          key={theme}
                          variant={selectedThemes.includes(theme) ? "secondary" : "outline"}
                          className={cn(
                            "cursor-pointer text-sm py-1.5 px-4 rounded-full",
                            selectedThemes.includes(theme) && "bg-primary/20 text-primary border-primary/30"
                          )}
                          onClick={() => setSelectedThemes(prev => prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme])}
                        >
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maturity Ratings Section */}
                {ratings && ratings.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Maturity
                        </Label>
                        {watchRegion && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-bold opacity-70">
                          {watchRegion}
                        </Badge>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ratings.map((rating: MediaRating) => (
                        <Badge
                          key={rating.Value}
                          variant={selectedRatings.includes(rating.Value) ? "default" : "outline"}
                          className="cursor-pointer text-sm py-1.5 px-4 rounded-full"
                          onClick={() => setSelectedRatings(prev => prev.includes(rating.Value) ? prev.filter(r => r !== rating.Value) : [...prev, rating.Value])}
                        >
                          {rating.Name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Language Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Language</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <Badge
                        key={lang.code}
                        variant={selectedLanguages.includes(lang.code) ? "secondary" : "outline"}
                        className={cn(
                          "cursor-pointer text-sm py-1.5 px-4 rounded-full",
                          selectedLanguages.includes(lang.code) && "bg-primary/20 text-primary border-primary/30"
                        )}
                        onClick={() => setSelectedLanguages([lang.code])}
                      >
                        {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Watch Providers Section */}
                {capabilities.hasStreamingSettings && availableWatchProviders.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Streaming Services</Label>
                      <div className="flex gap-3">
                        <button onClick={() => setSelectedWatchProviders(availableWatchProviders.map(p => p.Id))} className="text-xs font-semibold cursor-pointer text-primary hover:underline">Select all</button>
                        <button onClick={() => setSelectedWatchProviders([])} className="text-xs font-semibold cursor-pointer text-muted-foreground hover:underline">Clear</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                            onClick={() => setSelectedWatchProviders(prev => prev.includes(p.Id) ? prev.filter(id => id !== p.Id) : [...prev, p.Id])}
                            className={cn(
                              "relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer",
                              isSelected
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "bg-background border-input text-muted-foreground opacity-85 grayscale-[0.5]"
                            )}
                          >
                            <div className="relative size-10 shrink-0 rounded-lg overflow-hidden border">
                              <OptimizedImage
                                src={`https://image.tmdb.org/t/p/w92${p.LogoPath}`}
                                alt={p.Name}
                                className="object-cover"
                                unoptimized
                                width={40}
                                height={40}
                              />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-bold truncate">{p.Name}</span>
                              {providerMembers.length > 0 && (
                                <UserAvatarList
                                  users={providerMembers.map(m => ({ userId: m.userId, userName: m.userName }))}
                                  size="sm"
                                  className="mt-1"
                                />
                              )}
                            </div>
                            {isSelected && (
                              <Check className="size-4 text-primary shrink-0 stroke-3" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
