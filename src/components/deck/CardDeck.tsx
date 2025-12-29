"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSWR, { useSWRConfig } from "swr";
import { useUpdates } from "@/lib/use-updates";
import React, { useRef, useState, useMemo } from "react";
import axios from "axios";
import { JellyfinItem } from "@/types/swiparr";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, X, RotateCcw } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SwipeCard, TinderCardHandle } from "./SwipeCard";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { UserAvatarList } from "../session/UserAvatarList";

import { MatchOverlay } from "./MatchOverlay";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

export function CardDeck() {
  const { mutate } = useSWRConfig();
  const queryClient = useQueryClient();
  const { openMovie } = useMovieDetail();

  const { data: sessionStatus } = useSWR<{ code: string | null }>(
    "/api/session",
    (url: string) => axios.get(url).then(res => res.data)
  );

  const sessionCode = sessionStatus?.code || null;

  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const swipedIdsRef = useRef<Set<string>>(new Set());

  // Sync swipes to cache on unmount to handle fast tab switching
  React.useEffect(() => {
    return () => {
      const swiped = swipedIdsRef.current;
      if (swiped.size > 0) {
        queryClient.setQueryData(["deck", sessionCode], (old: JellyfinItem[] | undefined) => {
          if (!old) return old;
          return old.filter((item) => !swiped.has(item.Id));
        });
      }
    };
  }, [queryClient, sessionCode]);

  useUpdates(sessionCode);

  const { data: members } = useSWR<any[]>(
    sessionCode ? "/api/session/members" : null,
    (url: string) => axios.get(url).then(res => res.data)
  );

  // Clear local state when session changes to get a fresh start
  React.useEffect(() => {
    setRemovedIds([]);
    swipedIdsRef.current.clear();
  }, [sessionCode]);

  const [matchedItem, setMatchedItem] = useState<JellyfinItem | null>(null);

  // Store refs in a way React can track
  const cardRefs = useRef<Record<string, React.RefObject<TinderCardHandle | null>>>({});

  // Utility to make sure we always have a generic RefObject
  const getCardRef = (id: string) => {
    if (!cardRefs.current[id]) {
      // @ts-ignore - Create ref if missing
      cardRefs.current[id] = React.createRef<TinderCardHandle>();
    }
    return cardRefs.current[id];
  };

  const { data: deck, isLoading, isError, refetch } = useQuery({
    queryKey: ["deck", sessionCode],
    queryFn: async () => {
      const res = await axios.get<JellyfinItem[]>("/api/jellyfin/items");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- MULTIPLAYER LOGIC INTEGRATION HERE ---
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
        mutate("/api/session/matches");
      }
    },
    onError: (err) => {
      console.error("Swipe sync failed", err);
    }
  });

  // Calculate active deck
  const activeDeck = useMemo(() => {
    return deck ? deck.filter((item: JellyfinItem) => !removedIds.includes(item.Id)) : [];
  }, [deck, removedIds]);

  const onSwipe = (id: string, direction: "left" | "right") => {
    // 1. Only fire API calls here
    if (swipedIdsRef.current.has(id)) return;
    swipedIdsRef.current.add(id);

    const item = deck?.find((i) => i.Id === id);
    if (!item) return;

    // Fire the mutation (which checks for matches)
    swipeMutation.mutate({ id, direction, item });
  };

  const onCardLeftScreen = (id: string) => {
    // 2. Remove from state here (after animation is done)
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    // Update React Query cache so it persists even if the component unmounts
    queryClient.setQueryData(["deck", sessionCode], (old: JellyfinItem[] | undefined) => {
      return old?.filter((item) => item.Id !== id);
    });
  };

  const swipeTop = async (direction: "left" | "right") => {
    if (activeDeck.length === 0) return;

    // Active deck is filtered, so index 0 is always the visual top
    const topCard = activeDeck[0];
    const ref = getCardRef(topCard.Id);

    // Trigger the Framer Motion animation via Ref
    if (ref.current) {
      await ref.current.swipe(direction);
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        swipeTop("left");
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        swipeTop("right");
      } else if (e.key === "Enter" || e.key === " ") {
        if (activeDeck.length > 0) {
          openMovie(activeDeck[0].Id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDeck, openMovie]);

  if (isLoading) return <DeckSkeleton />;
  if (isError) return <div className="text-foreground text-center">Error loading deck. Check logs.</div>;
  if (activeDeck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
        <p className="mb-4">Nothing more.</p>
        <Button
          onClick={() => {
            setRemovedIds([]);
            swipedIdsRef.current.clear();
            refetch();
          }}
          variant="outline"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {sessionStatus?.code && members && members.length > 0 ? (
        <div className="">
          <UserAvatarList
            users={members.map((m: any) => ({ userId: m.jellyfinUserId, userName: m.jellyfinUserName }))}
            size="md"
          />
        </div>
      ) : <div className="h-9" />}
      <div className="relative w-full h-[67vh] flex justify-center items-center select-none">

        {/* Render bottom card first, then top card (Reverse order visually) */}
        {activeDeck.slice(0, 2).reverse().map((item: JellyfinItem, i, arr) => {
          // Recalculate index so 0 is front
          const zIndex = arr.length - 1 - i;
          return (
            <SwipeCard
              key={item.Id}
              ref={getCardRef(item.Id)}
               item={item}
              index={zIndex}
              onSwipe={onSwipe}
              onCardLeftScreen={onCardLeftScreen}
              onClick={() => openMovie(item.Id)}
            />
          );
        })}
      </div>

      <div className="flex gap-8 z-50 mt-4">
        <Button
          size="icon"
          variant="outline"
          className="h-18 w-18 rounded-full bg-background border-2"
          onClick={() => swipeTop("left")}
        >
          <X className="size-9" />
        </Button>
        <Button
          size="icon"
          className="h-18 w-18 rounded-full shadow-lg"
          onClick={() => swipeTop("right")}
        >
          <Heart className="size-9 fill-primary-foreground" />
        </Button>
      </div>

      <MatchOverlay
        item={matchedItem}
        onClose={() => setMatchedItem(null)}
      />
    </div>
  );
}

function DeckSkeleton() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <div className="h-10" />
      <div className="relative w-full h-[65vh] flex justify-center items-center">
        <Skeleton className="relative w-full h-full rounded-3xl" />
      </div>
      <div className="flex gap-8 mt-5.5">
        <Skeleton className="h-18 w-18 rounded-full" />
        <Skeleton className="h-18 w-18 rounded-full" />
      </div>
    </div>
  );
}
