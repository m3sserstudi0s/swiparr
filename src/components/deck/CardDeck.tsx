"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSWR, { useSWRConfig } from "swr";
import { useUpdates } from "@/lib/use-updates";
import React, { useRef, useState, useMemo } from "react";
import axios from "axios";
import { JellyfinItem } from "@/types/swiparr";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, X, RotateCcw, GalleryHorizontalEnd, RefreshCcwIcon, RefreshCcw } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SwipeCard, TinderCardHandle } from "./SwipeCard";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { UserAvatarList } from "../session/UserAvatarList";

import { MatchOverlay } from "./MatchOverlay";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

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
  if (isError) return (
          <div className="flex flex-col items-center justify-top h-[83vh] text-center text-muted-foreground ">
        <Empty className="from-muted/50 to-background h-full w-full bg-linear-to-b from-30% max-h-[67vh] mt-10 rounded-3xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GalleryHorizontalEnd />
            </EmptyMedia>
            <EmptyTitle className="text-foreground">Something unexpected happened.</EmptyTitle>
            <EmptyDescription>
              Reload the page to try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}>
              <RefreshCcw />
              Reload
            </Button>
          </EmptyContent>
        </Empty>
      </div>
  );
  if (activeDeck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-top h-[83vh] text-center text-muted-foreground ">
        <Empty className="from-muted/50 to-background h-full w-full bg-linear-to-b from-30% max-h-[67vh] mt-10 rounded-3xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GalleryHorizontalEnd />
            </EmptyMedia>
            <EmptyTitle className="text-foreground">Nothing left to swipe.</EmptyTitle>
            <EmptyDescription>
              You&apos;re all swiped up. Refresh to fetch more.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRemovedIds([]);
                swipedIdsRef.current.clear();
                refetch();
              }}>
              <RefreshCcw />
              Refresh
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {sessionStatus?.code && members && members.length > 0 ? (
        <div className="h-10">
          <UserAvatarList
            users={members.map((m: any) => ({ userId: m.jellyfinUserId, userName: m.jellyfinUserName }))}
            size="md"
          />
        </div>
      ) : <div className="h-10" />}
      <div className="relative w-full h-[65vh] flex justify-center items-center select-none">

        {/* Render bottom card first, then top card (Reverse order visually) */}
        {activeDeck.slice(0, 3).reverse().map((item: JellyfinItem, i, arr) => {
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
      <div className="flex gap-8 mt-4">
        <Skeleton className="h-18 w-18 rounded-full" />
        <Skeleton className="h-18 w-18 rounded-full" />
      </div>
    </div>
  );
}
