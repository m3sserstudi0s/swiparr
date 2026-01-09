"use client";
import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { JellyfinItem, Filters } from "@/types";
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

export function CardDeck() {
  const { openMovie } = useMovieDetail();

  const { data: sessionStatus, isLoading: isLoadingSession, isError: isErrorSession } = useSession();
  const sessionCode = sessionStatus?.code || null;
  const sessionFilters = sessionStatus?.filters || { genres: [] };
  const sessionSettings = sessionStatus?.settings;

  const { data: stats } = useStats();
  const { data: deck, isLoading, isError, refetch, isFetching } = useDeck();
  const { data: members } = useMembers();
  
  const swipeMutation = useSwipe();
  const undoSwipeMutation = useUndoSwipe();
  const updateSessionMutation = useUpdateSession();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const [lastSwipe, setLastSwipe] = useState<{ id: string; direction: "left" | "right" } | null>(null);
  const [rewindingId, setRewindingId] = useState<{ id: string; direction: "left" | "right" } | null>(null);
  const [displayDeck, setDisplayDeck] = useState<JellyfinItem[]>([]);
  const [matchedItem, setMatchedItem] = useState<JellyfinItem | null>(null);

  // Clear local state when session or filters change to get a fresh start
  const filtersJson = JSON.stringify(sessionStatus?.filters);
  useEffect(() => {
    setRemovedIds([]);
    swipedIdsRef.current.clear();
    setLastSwipe(null);
    setDisplayDeck([]);
  }, [sessionCode, filtersJson]);

  // Update displayDeck when new items are fetched
  useEffect(() => {
    if (deck && Array.isArray(deck)) {
      setDisplayDeck((prev) => {
        const existingIds = new Set(prev.map((i) => i.Id));
        const newItems = deck.filter((item) => !existingIds.has(item.Id));
        if (newItems.length === 0) return prev;
        return [...prev, ...newItems];
      });
    }
  }, [deck]);

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
    const { genres, yearRange, minCommunityRating, officialRatings, runtimeRange } = sessionStatus.filters;
    return (genres && genres.length > 0) || 
           (minCommunityRating !== undefined && minCommunityRating > 0) || 
           (yearRange !== undefined) || 
           (officialRatings && officialRatings.length > 0) || 
           (runtimeRange !== undefined);
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

    const item = displayDeck.find((i) => i.Id === id);
    if (!item) return;

    swipeMutation.mutate({ itemId: id, direction, item }, {
      onSuccess: (data) => {
        if (data.isMatch) {
          setMatchedItem(item);
        } else if (data.matchBlockedByLimit) {
          toast.error("Match not registered", {
            description: "Max number of matches reached",
            position: "top-center"
          });
        }
      },
      onError: (err) => {
        swipedIdsRef.current.delete(id);
        toast.error("Swipe failed", { description: getErrorMessage(err) });
      }
    });
  }, [sessionSettings, stats, displayDeck, swipeMutation]);

  const onCardLeftScreen = useCallback((id: string) => {
    if (!swipedIdsRef.current.has(id)) return;
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const activeDeck = useMemo(() => {
    return displayDeck.filter((item: JellyfinItem) => !removedIds.includes(item.Id));
  }, [displayDeck, removedIds]);

  useEffect(() => {
    if (!isFetching && activeDeck.length > 0 && activeDeck.length <= 15) {
      refetch();
    }
  }, [activeDeck.length, isFetching, refetch]);

  const swipeTop = useCallback(async (direction: "left" | "right") => {
    if (activeDeck.length === 0) return;
    const topCard = activeDeck[0];
    const ref = cardRefs.current[topCard.Id];
    if (ref && ref.current) {
      await ref.current.swipe(direction);
    }
  }, [activeDeck]);

  const rewind = useCallback(async () => {
    if (!lastSwipe) return;
    const { id, direction } = lastSwipe;

    setRewindingId({ id, direction });
    setRemovedIds((prev) => prev.filter((rid) => rid !== id));
    swipedIdsRef.current.delete(id);
    setLastSwipe(null);

    undoSwipeMutation.mutate(id, {
      onError: (err) => {
        toast.error("Failed to undo swipe", { description: getErrorMessage(err) });
      }
    });
  }, [lastSwipe, undoSwipeMutation]);

  useEffect(() => {
    if (rewindingId) {
      const ref = cardRefs.current[rewindingId.id];
      if (ref && ref.current) {
        ref.current.restore(rewindingId.direction);
        setRewindingId(null);
      }
    }
  }, [rewindingId, activeDeck]);

  const updateFilters = async (newFilters: Filters) => {
    toast.promise(updateSessionMutation.mutateAsync({ filters: newFilters }), {
      loading: "Applying filters...",
      success: "Filters updated",
      error: (err) => ({
        message: "Failed to update filters",
        description: getErrorMessage(err)
      })
    });
  };

  useHotkeys("left, a", () => swipeTop("left"), [swipeTop]);
  useHotkeys("right, d", () => swipeTop("right"), [swipeTop]);
  useHotkeys("enter, space", () => {
    if (activeDeck.length > 0) {
      openMovie(activeDeck[0].Id, {showLikedBy: false});
    }
  }, [activeDeck, openMovie]);
  useHotkeys("r, backspace", () => rewind(), [rewind]);
  useHotkeys("f", () => setIsFilterOpen(prev => !prev), []);

  const leftSwipesRemaining = useMemo(() => {
    if (!sessionSettings?.maxLeftSwipes) return undefined;
    return Math.max(0, sessionSettings.maxLeftSwipes - (stats?.mySwipes.left || 0));
  }, [sessionSettings?.maxLeftSwipes, stats?.mySwipes.left]);

  const rightSwipesRemaining = useMemo(() => {
    if (!sessionSettings?.maxRightSwipes) return undefined;
    return Math.max(0, sessionSettings.maxRightSwipes - (stats?.mySwipes.right || 0));
  }, [sessionSettings?.maxRightSwipes, stats?.mySwipes.right]);

  const showLoader = isLoadingSession || (isFetching && activeDeck.length === 0) || updateSessionMutation.isPending;
  if (showLoader) return <DeckLoading />;
  if ((isError || isErrorSession) && activeDeck.length === 0) return <DeckError />;
  
  if (activeDeck.length === 0) {
    return (
      <div className="w-full">
        <DeckEmpty
          onRefresh={() => {
            setRemovedIds([]);
            swipedIdsRef.current.clear();
            setLastSwipe(null);
            setDisplayDeck([]);
            refetch();
          }}
          onOpenFilter={() => setIsFilterOpen(true)}
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

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {sessionStatus?.code && members && members.length > 0 ? (
        <div className="h-8.75">
          <UserAvatarList
            users={members.map((m) => ({ userId: m.jellyfinUserId, userName: m.jellyfinUserName }))}
            size="md"
          />
        </div>
      ) : <div className="h-8.75" />}
      <div className="relative w-full h-[68svh] flex justify-center items-center select-none">
        {activeDeck.slice(0, 4).reverse().map((item: JellyfinItem, i, arr) => {
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
              onClick={() => openMovie(item.Id, {showLikedBy: false} )}
              preventSwipe={prevent}
            />
          );
        })}
      </div>

      <DeckControls
        onRewind={rewind}
        onSwipeLeft={() => swipeTop("left")}
        onSwipeRight={() => swipeTop("right")}
        onOpenFilter={() => setIsFilterOpen(true)}
        canRewind={!!lastSwipe}
        hasAppliedFilters={hasAppliedFilters}
        leftSwipesRemaining={leftSwipesRemaining}
        rightSwipesRemaining={rightSwipesRemaining}
      />

      <MatchOverlay
        item={matchedItem}
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
