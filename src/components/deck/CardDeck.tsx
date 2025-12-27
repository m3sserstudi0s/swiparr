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
import { SwipeCard, TinderCardHandle } from "./SwipeCard";
import { MovieDetailView } from "../movie/MovieDetailView";
import { UserAvatarList } from "../session/UserAvatarList";

import { MatchOverlay } from "./MatchOverlay";

export function CardDeck() {
  const { mutate } = useSWRConfig();

  const [removedIds, setRemovedIds] = useState<string[]>([]);

  // -- SESSION STATUS & MEMBERS --
  const { data: sessionStatus } = useSWR<{ code: string | null }>(
    "/api/session",
    (url: string) => axios.get(url).then(res => res.data)
  );

  useUpdates(sessionStatus?.code);

  const { data: members } = useSWR<any[]>(
    sessionStatus?.code ? "/api/session/members" : null,
    (url: string) => axios.get(url).then(res => res.data)
  );

  const swipedIdsRef = useRef<Set<string>>(new Set());

  // Store refs in a way React can track
  const cardRefs = useRef<Record<string, React.RefObject<TinderCardHandle | null>>>({});

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedItem, setMatchedItem] = useState<JellyfinItem | null>(null);

  // Utility to make sure we always have a generic RefObject
  const getCardRef = (id: string) => {
    if (!cardRefs.current[id]) {
      // @ts-ignore - Create ref if missing
      cardRefs.current[id] = React.createRef<TinderCardHandle>();
    }
    return cardRefs.current[id];
  };

  const { data: deck, isLoading, isError, refetch } = useQuery({
    queryKey: ["deck"],
    queryFn: async () => {
      const res = await axios.get<JellyfinItem[]>("/api/jellyfin/items");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- MULTIPLAYER LOGIC INTEGRATION HERE ---
  const swipeMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "left" | "right" }) => {
      const res = await axios.post("/api/swipe", { itemId: id, direction });
      return { data: res.data, id };
    },
    onSuccess: ({ data, id }) => {
      // 1. Check if the server returned a Match
      if (data.isMatch) {
        const item = deck?.find((i: JellyfinItem) => i.Id === id);
        if (item) {
          setMatchedItem(item);
        }
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

    // Fire the mutation (which checks for matches)
    swipeMutation.mutate({ id, direction });
  };

  const onCardLeftScreen = (id: string) => {
    // 2. Remove from state here (after animation is done)
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
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
    <div className="relative flex flex-col items-center justify-center w-full h-[83vh]">
      {sessionStatus?.code && members && members.length > 0 ? (
        <div className="">
          <UserAvatarList
            users={members.map((m: any) => ({ userId: m.jellyfinUserId, userName: m.jellyfinUserName }))}
            size="md"
          />
        </div>
      ) : <div className="h-9" />}
      <div className="relative w-full h-[75vh] flex justify-center items-center">

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
              onClick={() => setSelectedId(item.Id)}
            />
          );
        })}
      </div>

      <div className="flex gap-8 z-50 mt-4">
        <Button
          size="icon"
          variant="outline"
          className="h-16 w-16 rounded-full bg-background border-2"
          onClick={() => swipeTop("left")}
        >
          <X className="size-8" />
        </Button>
        <Button
          size="icon"
          className="h-16 w-16 rounded-full shadow-lg"
          onClick={() => swipeTop("right")}
        >
          <Heart className="size-8 fill-primary-foreground" />
        </Button>
      </div>
      {/* MOUNT THE MODAL */}
      <MovieDetailView
        movieId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      <MatchOverlay
        item={matchedItem}
        onClose={() => setMatchedItem(null)}
      />
    </div>
  );
}

function DeckSkeleton() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-[83vh]">
      <div className="h-10" />
      <div className="relative w-full h-[83vh] flex justify-center items-center">
        <Skeleton className="relative w-full h-[65vh] max-w-sm rounded-3xl" />
      </div>
      <div className="flex gap-8 mt-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    </div>
  );
}
