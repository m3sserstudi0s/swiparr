"use client";
import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { MediaItem, Filters } from "@/types";
import { SwipeCard, TinderCardHandle } from "./SwipeCard";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { UserAvatarList } from "../session/UserAvatarList";
import { FilterDrawer } from "./FilterDrawer";
import { MatchOverlay } from "./MatchOverlay";
import { useHotkeys } from "react-hotkeys-hook";
import { DeckControls } from "./DeckControls";
import { DeckEmpty } from "./DeckEmpty";
import { DeckError } from "./DeckError";
import { DeckLoading } from "./DeckLoading";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { 
  useSession, 
  useDeck, 
  useStats, 
  useMembers, 
  useSwipe, 
  useUndoSwipe, 
  useUpdateSession 
} from "@/hooks/api";
import { useBackgroundStore } from "@/lib/background-store";
import { ProviderType } from "@/lib/providers/types";

export function CardDeck() {

  const { openMovie } = useMovieDetail();

  const { data: sessionStatus, isLoading: isLoadingSession, isError: isErrorSession } = useSession();
  const sessionCode = sessionStatus?.code || null;
  const sessionFilters = sessionStatus?.filters || { genres: [] };
  const sessionSettings = sessionStatus?.settings;

  const { data: stats } = useStats();
  const { 
    data: deckData, 
    isLoading, 
    isError, 
    refetch, 
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useDeck();

  // Flatten the pages from useInfiniteQuery
  const deck = useMemo(() => {
    return deckData?.pages.flatMap(page => page.items) || [];
  }, [deckData]);
  const { data: members } = useMembers();
  
  const swipeMutation = useSwipe();
  const undoSwipeMutation = useUndoSwipe();
  const updateSessionMutation = useUpdateSession();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const [lastSwipe, setLastSwipe] = useState<{ id: string; direction: "left" | "right" } | null>(null);
  const [rewindingId, setRewindingId] = useState<{ id: string; direction: "left" | "right" } | null>(null);
  const [displayDeck, setDisplayDeck] = useState<MediaItem[]>([]);
  const [matchedItem, setMatchedItem] = useState<MediaItem | null>(null);

  const { setBackgroundItem } = useBackgroundStore();

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track session/filters to detect mode changes
  const filtersJson = JSON.stringify(sessionStatus?.filters);
  const settingsHash = sessionStatus?.settingsHash;
  const currentModeRef = useRef<{ sessionCode: string | null; filtersJson: string }>({ 
    sessionCode, 
    filtersJson 
  });

  useEffect(() => {
    // If the session code or filters changed, we are transitioning to a new "mode"
    if (currentModeRef.current.sessionCode !== sessionCode || currentModeRef.current.filtersJson !== filtersJson) {
      setIsTransitioning(true);
      currentModeRef.current = { sessionCode, filtersJson };
      
      // If we already have the deck data (it's cached in React Query),
      // we can apply it immediately instead of waiting for the next effect run
      if (deck && Array.isArray(deck) && !isLoading) {
        setDisplayDeck(deck);
        setRemovedIds([]);
        swipedIdsRef.current.clear();
        setLastSwipe(null);
        setIsTransitioning(false);
      }
    }
  }, [sessionCode, filtersJson, settingsHash, deck, isLoading]);

   // Update displayDeck when new items are fetched or filters change
  useEffect(() => {
    if (deck && Array.isArray(deck) && !isLoading) {
      if (isTransitioning) {
        // First batch of data for new filters/mode has arrived
        setDisplayDeck(deck);
        setRemovedIds([]);
        swipedIdsRef.current.clear();
        setLastSwipe(null);
        setIsTransitioning(false);
      } else {
        // Normal pagination or data update within the same mode
        // If we are in the middle of a transition but deck changed, it's likely the new data
        setDisplayDeck((prev) => {
          // If the deck is completely different (e.g. session change), reset instead of append
          // We detect this by checking if there's any overlap in the first few items
          const currentFirstId = prev[0]?.Id;
          const newFirstId = deck[0]?.Id;
          
          if (prev.length > 0 && newFirstId && !deck.some(item => item.Id === currentFirstId) && !prev.some(item => item.Id === newFirstId)) {
            // Deck seems entirely new, reset state
            // Use setTimeout to avoid state updates during render if needed, but here it's inside an effect
            setRemovedIds([]);
            swipedIdsRef.current.clear();
            setLastSwipe(null);
            return deck;
          }

          const existingIds = new Set(prev.map((i) => i.Id));
          const newItems = deck.filter((item) => !existingIds.has(item.Id));
          if (newItems.length === 0) return prev;
          return [...prev, ...newItems];
        });
      }
    }
  }, [deck, deckData, isLoading, isTransitioning]);

  // Fallback to clear transition state if data is already there but effect didn't catch it
  useEffect(() => {
    if (isTransitioning && deckData && !isLoading) {
      setIsTransitioning(false);
    }
  }, [isTransitioning, deckData, isLoading]);

  const cardRefs = useRef<Record<string, React.RefObject<TinderCardHandle | null>>>({});

  // Pre-generate refs for the deck to avoid modifying refs during render
  useMemo(() => {
    displayDeck.forEach(item => {
      if (!cardRefs.current[item.Id]) {
        cardRefs.current[item.Id] = React.createRef<TinderCardHandle>();
      }
    });
  }, [displayDeck]);

  const getCardRef = (id: string) => {
    return cardRefs.current[id];
  };

  const hasAppliedFilters = useMemo(() => {
    if (!sessionStatus?.filters) return false;
    const {
      genres,
      excludedGenres,
      yearRange,
      minCommunityRating,
      officialRatings,
      excludedOfficialRatings,
      runtimeRange,
      themes,
      excludedThemes,
      sortBy,
      tmdbLanguages
    } = sessionStatus.filters;
    const hasNonDefaultLanguages = !!(tmdbLanguages && tmdbLanguages.length > 0);
    const defaultSort = sessionStatus?.provider === ProviderType.TMDB ? "Popular" : "Trending";
    return (genres && genres.length > 0) || 
           (excludedGenres && excludedGenres.length > 0) ||
           (minCommunityRating !== undefined && minCommunityRating > 0) || 
           (yearRange !== undefined) || 
           (officialRatings && officialRatings.length > 0) || 
           (excludedOfficialRatings && excludedOfficialRatings.length > 0) ||
           (runtimeRange !== undefined) ||
           (themes && themes.length > 0) ||
           (excludedThemes && excludedThemes.length > 0) ||
           (sortBy !== undefined && sortBy !== defaultSort) ||
           hasNonDefaultLanguages;
  }, [sessionStatus?.filters]);

  const onSwipe = useCallback((id: string, direction: "left" | "right") => {
    // Check limits
    if (sessionSettings && stats) {
      if (direction === "right" && sessionSettings.maxRightSwipes && stats.mySwipes.right >= sessionSettings.maxRightSwipes) {
        toast.error("No likes left", { position: 'top-right', description: "Max number of likes reached" });
        return;
      }
      if (direction === "left" && sessionSettings.maxLeftSwipes && stats.mySwipes.left >= sessionSettings.maxLeftSwipes) {
        toast.error("No dislikes left", { position: 'top-right', description: "Max number of dislikes reached" });
        return;
      }
    }

    if (swipedIdsRef.current.has(id)) return;
    swipedIdsRef.current.add(id);
    setLastSwipe({ id, direction });
  }, [sessionSettings, stats]);

  const onCardLeftScreen = useCallback((id: string, direction: "left" | "right") => {
    if (!swipedIdsRef.current.has(id)) return;
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    const item = displayDeck.find((i) => i.Id === id);
    if (!item) return;

    swipeMutation.mutate({ itemId: id, direction, item }, {
      onSuccess: (data) => {
        if (data.isMatch) {
          setMatchedItem({
            ...item,
            likedBy: data.likedBy
          });
        } else if (data.matchBlockedByLimit) {
          toast.error("Match not registered", {
            description: "Max number of matches reached",
            position: "top-right"
          });
        }
      },
      onError: (err) => {
        swipedIdsRef.current.delete(id);
        setRemovedIds(prev => prev.filter(rid => rid !== id));
        toast.error("Swipe failed", { description: getErrorMessage(err) });
      }
    });
  }, [displayDeck, swipeMutation]);

  const filteredDeck = useMemo(() => {
    return displayDeck.filter((item: MediaItem) => !removedIds.includes(item.Id));
  }, [displayDeck, removedIds]);

    const activeDeck = useMemo(() => {
    return filteredDeck.filter((item: MediaItem) => !swipedIdsRef.current.has(item.Id));
  }, [filteredDeck]);

  // Fetch next page when deck is running low
  useEffect(() => {
    if (activeDeck.length < 10 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [activeDeck.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const topItem = activeDeck[0];
    if (topItem) {
      setBackgroundItem({ id: topItem.Id, blurDataURL: topItem.BlurDataURL });
    } else {
      setBackgroundItem(null);
    }
  }, [activeDeck, setBackgroundItem]);

  const handleSwipeAction = (direction: "left" | "right") => {
    const topCard = activeDeck[0];
    if (topCard) {
      const ref = cardRefs.current[topCard.Id];
      if (ref?.current) {
        ref.current.swipe(direction);
      }
    }
  };

  const rewind = async () => {
    if (!lastSwipe) return;
    const { id, direction } = lastSwipe;
    
    try {
      await undoSwipeMutation.mutateAsync(id);
      setRewindingId({ id, direction });
      swipedIdsRef.current.delete(id);
      setRemovedIds(prev => prev.filter(rid => rid !== id));
      setLastSwipe(null);
    } catch (err) {
      toast.error("Undo failed");
    }
  };

  useEffect(() => {
    if (rewindingId) {
      const ref = cardRefs.current[rewindingId.id];
      if (ref?.current) {
        ref.current.restore(rewindingId.direction);
        setRewindingId(null);
      }
    }
  }, [rewindingId, activeDeck]);

  const updateFilters = (newFilters: Filters) => {
    updateSessionMutation.mutate({ filters: newFilters });
    setIsFilterOpen(false);
  };

  useHotkeys("left", () => handleSwipeAction("left"), { enabled: !isFilterOpen && activeDeck.length > 0 });
  useHotkeys("right", () => handleSwipeAction("right"), { enabled: !isFilterOpen && activeDeck.length > 0 });
  useHotkeys("up", () => activeDeck[0] && openMovie(activeDeck[0].Id, { showLikedBy: false, sessionCode }), { enabled: !isFilterOpen && activeDeck.length > 0 });

  if (isLoadingSession || isTransitioning || (activeDeck.length === 0 && (isLoading || isFetchingNextPage))) {
    return <DeckLoading />;
  }

  if (isErrorSession || isError) {
    return <DeckError />;
  }

  const leftSwipesRemaining = sessionSettings?.maxLeftSwipes ? Math.max(0, sessionSettings.maxLeftSwipes - (stats?.mySwipes.left || 0)) : undefined;
  const rightSwipesRemaining = sessionSettings?.maxRightSwipes ? Math.max(0, sessionSettings.maxRightSwipes - (stats?.mySwipes.right || 0)) : undefined;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {sessionStatus?.code && members && members.length > 0 ? (
        <div className="h-8.75">
          <UserAvatarList
            users={members.map((m) => ({ 
              userId: m.externalUserId, 
              userName: m.externalUserName,
              hasCustomProfilePicture: !!m.hasCustomProfilePicture,
              profileUpdatedAt: m.profileUpdatedAt
            }))}
            size="md"
          />
        </div>
      ) : <div className="h-8.75" />}
      <div className="relative w-full h-[68svh] flex justify-center items-center select-none">
        {activeDeck.length === 0 ? (
          <DeckEmpty onRefresh={() => {
            setRemovedIds([]);
            swipedIdsRef.current.clear();
            setDisplayDeck([]);
            refetch();
          }} onOpenFilter={() => setIsFilterOpen(true)} />
        ) : (
          <>
            {activeDeck.slice(0, 4).reverse().map((item: MediaItem, i, arr) => {
              const zIndex = arr.length - 1 - i;
              const prevent: ("left" | "right")[] = [];
              if (sessionSettings?.maxLeftSwipes && (stats?.mySwipes.left || 0) >= sessionSettings.maxLeftSwipes) prevent.push("left");
              if (sessionSettings?.maxRightSwipes && (stats?.mySwipes.right || 0) >= sessionSettings.maxRightSwipes) prevent.push("right");

              return (
                <SwipeCard
                  key={item.Id}
                  ref={getCardRef(item.Id)}
                  item={item}
                  index={zIndex}
                   onSwipe={onSwipe}
                   onCardLeftScreen={onCardLeftScreen}
                   onClick={() => openMovie(item.Id, { showLikedBy: false, sessionCode })}
                   preventSwipe={prevent}
                 />
              );
            })}
          </>
        )}
      </div>

      <DeckControls
        onRewind={rewind}
        onSwipeLeft={() => handleSwipeAction("left")}
        onSwipeRight={() => handleSwipeAction("right")}
        onOpenFilter={() => setIsFilterOpen(true)}
        canRewind={!!lastSwipe}
        hasAppliedFilters={hasAppliedFilters}
        leftSwipesRemaining={leftSwipesRemaining}
        rightSwipesRemaining={rightSwipesRemaining}
      />

      <MatchOverlay
        item={matchedItem}
        sessionCode={sessionCode}
        onClose={() => setMatchedItem(null)}
      />

      <FilterDrawer
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        currentFilters={sessionFilters}
        onSave={updateFilters}
      />
    </div>
  );
}
