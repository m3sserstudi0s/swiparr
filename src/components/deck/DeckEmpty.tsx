import React from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowsCounterClockwise,
  SlidersHorizontal,
  CardsThree,
} from "@phosphor-icons/react/dist/ssr";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface DeckEmptyProps {
  onRefresh: () => void;
  onOpenFilter: () => void;
  deckMode?: string;
}

/**
 * The copy has to match the deck, or an empty Continue looks like a broken app:
 * "nothing left to swipe" is true of a movies deck and misleading when the reason
 * is that nothing has been started yet.
 */
const EMPTY_COPY: Record<string, { title: string; description: string }> = {
  continue: {
    title: "Nothing to continue.",
    description: "Start watching a show and its next episode will land here.",
  },
  episodes: {
    title: "No unwatched episodes.",
    description: "Episodes of the shows you have started appear here until you have seen them.",
  },
  shows: {
    title: "Nothing left to swipe.",
    description: "You're all swiped up on shows. Refresh to fetch more, or adjust the filters.",
  },
  mixed: {
    title: "Nothing left to swipe.",
    description: "Films and shows are used up. Refresh to fetch more, or adjust the filters.",
  },
};

export function DeckEmpty({ onRefresh, onOpenFilter, deckMode }: DeckEmptyProps) {
  const copy = EMPTY_COPY[deckMode ?? "movies"] ?? {
    title: "Nothing left to swipe.",
    description: "You're all swiped up. Refresh to fetch more, or adjust the filters.",
  };
  return (
    <div className="flex flex-col items-center justify-top text-center h-full text-muted-foreground ">
      <Empty className="w-full h-full mt-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CardsThree className="rotate-[270deg]" />
          </EmptyMedia>
          <EmptyTitle className="text-foreground">{copy.title}</EmptyTitle>
          <EmptyDescription>{copy.description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-row justify-center">
          <Button
            variant="outline"
            size="sm"
            className="w-28"
            onClick={onRefresh}
          >
            <ArrowsCounterClockwise />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-28"
            onClick={onOpenFilter}
          >
            <SlidersHorizontal />
            Filter
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
