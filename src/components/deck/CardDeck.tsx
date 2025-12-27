"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useRef, useState, useMemo } from "react";
import axios from "axios";
import { JellyfinItem } from "@/types/swiparr";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, X, RotateCcw } from "lucide-react";
import { SwipeCard, TinderCardHandle } from "./SwipeCard";
import { toast } from "sonner";
import { MovieDetailView } from "../movie/MovieDetailView";

export function CardDeck() {
  const queryClient = useQueryClient(); // Need this to refresh the sidebar

  const [removedIds, setRemovedIds] = useState<string[]>([]);

  // Used to prevent API double-fires
  const swipedIdsRef = useRef<Set<string>>(new Set());

  // Store refs in a way React can track
  const cardRefs = useRef<Record<string, React.RefObject<TinderCardHandle | null>>>({});

  const [selectedId, setSelectedId] = useState<string | null>(null);


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
      // Find title for the toast notification
      const itemTitle = deck?.find((i: JellyfinItem) => i.Id === id)?.Name || "Movie";

      const res = await axios.post("/api/swipe", { itemId: id, direction });

      // Pass data + title to onSuccess
      return { data: res.data, title: itemTitle };
    },
    onSuccess: ({ data, title }) => {
      // 1. Check if the server returned a Match
      if (data.isMatch) {
        toast("IT'S A MATCH",
          {
            description: `You both want to watch ${title}`,
            // Make it green and visible
            className: "bg-green-600 border-green-700 text-white font-bold",
            duration: 5000,
          });
        // 2. Refresh the Sidebar match list immediately
        queryClient.invalidateQueries({ queryKey: ["matches"] });
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
    <div className="relative flex flex-col items-center justify-center w-full h-[80vh]">
      <div className="relative w-full h-[65vh] flex justify-center items-center">
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

      <div className="flex gap-8 mt-8 z-50">
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
    </div>
  );
}

function DeckSkeleton() {
  return (
    <div className="flex flex-col items-center gap-8 h-[80vh] justify-center">
      <Skeleton className="h-[65vh] w-full max-w-sm rounded-3xl" />
      <div className="flex gap-8">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    </div>
  );
}