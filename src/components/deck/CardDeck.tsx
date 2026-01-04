"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSWR, { useSWRConfig } from "swr";
import React, { useRef, useState, useMemo } from "react";
import axios from "axios";
import { JellyfinItem, Filters, SessionSettings, SessionStats } from "@/types/swiparr";
import { Heart, X, GalleryHorizontalEnd, RefreshCcw, Rewind, SlidersHorizontal } from "lucide-react";
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
import { API_PATHS } from "@/lib/api-paths";

export function CardDeck() {
  const { mutate } = useSWRConfig();
  const queryClient = useQueryClient();
  const { openMovie } = useMovieDetail();

  const { data: sessionStatus } = useSWR<{ code: string | null; filters: Filters | null; settings: SessionSettings | null }>(
    "/api/session",
    (url: string) => axios.get(url).then(res => res.data)
  );

  const sessionCode = sessionStatus?.code || null;
  const sessionFilters = sessionStatus?.filters || { genres: [] };
  const sessionSettings = sessionStatus?.settings;

  const { data: stats, mutate: mutateStats } = useSWR<SessionStats>(
    sessionCode ? "/api/session/stats" : null,
    (url: string) => axios.get(url).then(res => res.data)
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const [lastSwipe, setLastSwipe] = useState<{ id: string; direction: "left" | "right" } | null>(null);
  const [rewindingId, setRewindingId] = useState<{ id: string; direction: "left" | "right" } | null>(null);

  const [displayDeck, setDisplayDeck] = useState<JellyfinItem[]>([]);

  // Sync swipes to cache on unmount to handle fast tab switching
  React.useEffect(() => {
    const currentSwipedIds = swipedIdsRef.current;
    return () => {
      if (currentSwipedIds.size > 0) {
        queryClient.setQueryData(["deck", sessionCode], (old: JellyfinItem[] | undefined) => {
          if (!old) return old;
          return old.filter((item) => !currentSwipedIds.has(item.Id));
        });
      }
    };
  }, [queryClient, sessionCode]);

  const { data: members } = useSWR<{ jellyfinUserId: string; jellyfinUserName: string }[]>(
    sessionCode ? ["/api/session/members", sessionCode] : null,
    ([url]: [string]) => axios.get(url).then(res => res.data)
  );

  const filtersJson = JSON.stringify(sessionStatus?.filters);
  // Clear local state when session or filters change to get a fresh start
  React.useEffect(() => {
    setRemovedIds([]);
    swipedIdsRef.current.clear();
    setLastSwipe(null);
    setDisplayDeck([]);
  }, [sessionCode, filtersJson]);

  const [matchedItem, setMatchedItem] = useState<JellyfinItem | null>(null);

  // Store refs in a way React can track
  const cardRefs = useRef<Record<string, React.RefObject<TinderCardHandle | null>>>({});

  const { data: deck, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["deck", sessionCode],
    queryFn: async () => {
      const res = await axios.get<JellyfinItem[]>(API_PATHS.items);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Update displayDeck when new items are fetched
  React.useEffect(() => {
    if (deck) {
      setDisplayDeck((prev) => {
        const existingIds = new Set(prev.map((i) => i.Id));
        const newItems = deck.filter((item) => !existingIds.has(item.Id));
        if (newItems.length === 0) return prev;
        return [...prev, ...newItems];
      });
    }
  }, [deck]);

  // Pre-generate refs for the deck to avoid modifying refs during render
  useMemo(() => {
    displayDeck.forEach(item => {
      if (!cardRefs.current[item.Id]) {
        cardRefs.current[item.Id] = React.createRef<TinderCardHandle>();
      }
    });
  }, [displayDeck]);

  // Utility to make sure we always have a generic RefObject
  const getCardRef = (id: string) => {
    return cardRefs.current[id];
  };

  // Check if filters are non-default
  const hasAppliedFilters = useMemo(() => {
    if (!sessionStatus?.filters) return false;
    const { genres, yearRange, minCommunityRating } = sessionStatus.filters;
    const genresApplied = genres && genres.length > 0;
    const ratingApplied = minCommunityRating !== undefined && minCommunityRating > 0;
    const yearApplied = yearRange !== undefined;
    
    return genresApplied || ratingApplied || yearApplied;
  }, [sessionStatus?.filters]);

  // --- MULTIPLAYER LOGIC INTEGRATION ---
  const swipeMutation = useMutation({
    mutationFn: async ({ id, direction, item }: { id: string; direction: "left" | "right"; item: JellyfinItem }) => {
      const res = await axios.post("/api/swipe", { itemId: id, direction, item });
      return { data: res.data, id, item };
    },
    onSuccess: ({ data, item }) => {
      // 1. Check if the server returned a Match
      if (data.isMatch) {
        setMatchedItem(item);
        // 2. Refresh the Sidebar match list immediately via SWR
        mutate(["/api/session/matches", sessionCode]);
      }
    },
    onError: (err) => {
      console.error("Swipe sync failed", err);
    }
  });

  // Calculate active deck
  const activeDeck = useMemo(() => {
    return displayDeck.filter((item: JellyfinItem) => !removedIds.includes(item.Id));
  }, [displayDeck, removedIds]);

  // Auto-refresh when deck is low
  React.useEffect(() => {
    if (!isFetching && activeDeck.length > 0 && activeDeck.length <= 5) {
      refetch();
    }
  }, [activeDeck.length, isFetching, refetch]);

  const onSwipe = (id: string, direction: "left" | "right") => {
    // Check limits
    if (sessionSettings) {
      if (direction === "right" && sessionSettings.maxRightSwipes && stats) {
        if (stats.mySwipes.right >= sessionSettings.maxRightSwipes) {
          toast.error("Like limit reached", {position: 'top-right'});
          return;
        }
      }
      if (direction === "left" && sessionSettings.maxLeftSwipes && stats) {
        if (stats.mySwipes.left >= sessionSettings.maxLeftSwipes) {
          toast.error("Nope limit reached", {position: 'top-right'});
          return;
        }
      }
    }

    // 1. Only fire API calls here
    if (swipedIdsRef.current.has(id)) return;
    swipedIdsRef.current.add(id);

    setLastSwipe({ id, direction });

    const item = displayDeck.find((i) => i.Id === id);
    if (!item) return;

    // Fire the mutation (which checks for matches)
    swipeMutation.mutate({ id, direction, item });
    // Optimistically update stats
    if (stats) {
        mutateStats({
            ...stats,
            mySwipes: {
                ...stats.mySwipes,
                [direction]: stats.mySwipes[direction] + 1
            }
        }, false);
    }
  };

  const onCardLeftScreen = (id: string) => {
    // If the card was rewound, don't remove it
    if (!swipedIdsRef.current.has(id)) return;

    // 2. Remove from state here (after animation is done)
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const swipeTop = React.useCallback(async (direction: "left" | "right") => {
    if (activeDeck.length === 0) return;

    // Active deck is filtered, so index 0 is always the visual top
    const topCard = activeDeck[0];
    const ref = cardRefs.current[topCard.Id];

    // Trigger the Framer Motion animation via Ref
    if (ref && ref.current) {
      await ref.current.swipe(direction);
    }
  }, [activeDeck]);

  const rewind = async () => {
    if (!lastSwipe) return;
    const { id, direction } = lastSwipe;

    setRewindingId({ id, direction });
    setRemovedIds((prev) => prev.filter((rid) => rid !== id));
    swipedIdsRef.current.delete(id);
    setLastSwipe(null);

    try {
      await axios.delete("/api/swipe", { data: { itemId: id } });
    } catch (err) {
      console.error("Failed to undo swipe", err);
    }
  };

  // Effect to trigger animation after card is re-mounted
  React.useEffect(() => {
    if (rewindingId) {
      const ref = cardRefs.current[rewindingId.id];
      if (ref && ref.current) {
        ref.current.restore(rewindingId.direction);
        setRewindingId(null);
      }
    }
  }, [rewindingId, activeDeck]);

  const updateFilters = async (newFilters: Filters) => {
    setIsApplyingFilters(true);
    try {
      await axios.patch("/api/session", { filters: newFilters });
      await mutate("/api/session"); // Refresh session status to get new filters
      await queryClient.invalidateQueries({ queryKey: ["deck", sessionCode] });
    } finally {
      setIsApplyingFilters(false);
    }
  };

  // Keyboard shortcuts
  useHotkeys("left, a", () => swipeTop("left"), [swipeTop]);
  useHotkeys("right, d", () => swipeTop("right"), [swipeTop]);
  useHotkeys("enter, space", () => {
    if (activeDeck.length > 0) {
      openMovie(activeDeck[0].Id, false); // Don't show liked by from swipe deck (no spoilers)
    }
  }, [activeDeck, openMovie]);
  useHotkeys("r, backspace", () => rewind(), [rewind]);
  useHotkeys("f", () => setIsFilterOpen(prev => !prev), []);

  const showLoader = (isFetching && activeDeck.length === 0) || isApplyingFilters;
  if (showLoader) return <DeckLoading />;
  if (isError && activeDeck.length === 0) return <DeckError />;
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
        <div className="h-10">
          <UserAvatarList
            users={members.map((m) => ({ userId: m.jellyfinUserId, userName: m.jellyfinUserName }))}
            size="md"
          />
        </div>
      ) : <div className="h-10" />}
      <div className="relative w-full h-[65vh] flex justify-center items-center select-none">

        {/* Render bottom card first, then top card (Reverse order visually) */}
        {activeDeck.slice(0, 4).reverse().map((item: JellyfinItem, i, arr) => {
          // Recalculate index so 0 is front
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
              onClick={() => openMovie(item.Id, false)} // Don't show liked by from swipe deck (no spoilers)
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
        disableLeft={sessionSettings?.maxLeftSwipes ? (stats?.mySwipes.left || 0) >= sessionSettings.maxLeftSwipes : false}
        disableRight={sessionSettings?.maxRightSwipes ? (stats?.mySwipes.right || 0) >= sessionSettings.maxRightSwipes : false}
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
