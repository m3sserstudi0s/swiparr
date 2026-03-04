import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, SlidersHorizontal, GalleryHorizontalEnd } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useTranslations } from "next-intl";

interface DeckEmptyProps {
  onRefresh: () => void;
  onOpenFilter: () => void;
}

export function DeckEmpty({ onRefresh, onOpenFilter }: DeckEmptyProps) {
  const t = useTranslations('Deck');
  const tUI = useTranslations('UI');

  return (
    <div className="flex flex-col items-center justify-top text-center h-full text-muted-foreground ">
      <Empty className="w-full h-full mt-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GalleryHorizontalEnd />
          </EmptyMedia>
          <EmptyTitle className="text-foreground">{t('emptyTitle')}</EmptyTitle>
          <EmptyDescription>
            {t('emptyDesc')}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-row justify-center">
          <Button
            variant="outline"
            size="sm"
            className="w-28"
            onClick={onRefresh}
          >
            <RefreshCcw />
            {t('refreshBtn')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-28"
            onClick={onOpenFilter}
          >
            <SlidersHorizontal />
            {tUI('filterBtn')}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
