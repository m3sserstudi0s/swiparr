"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal } from "lucide-react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useSession } from "@/hooks/api";
import { useTranslations } from "next-intl";

interface FilterProps {
  sortBy: string;
  setSortBy: (v: string) => void;
  filterMode: string;
  setFilterMode: (v: string) => void;
}

export function LikesFilter({ sortBy, setSortBy, filterMode, setFilterMode }: FilterProps) {
  const t = useTranslations('LikesFilter');
  const tUI = useTranslations('UI');
  const { data: sessionStatus } = useSession();

  const isSoloMode = !sessionStatus?.code

  useEffect(() => {
    if (isSoloMode && sortBy === "likes") {
      setSortBy("date");
    }
  }, [isSoloMode, sortBy, setSortBy]);

  const handleSortChange = (v: string) => {
    if (!v) return;
    if (v === "likes" && isSoloMode) return;
    setSortBy(v);
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon" className="size-10 gap-2 text-xs border-border bg-muted/50">
          <SlidersHorizontal className="size-5.5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{t('title')}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-20 space-y-6">

            {/* SORTING */}
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">{t('sortBy')}</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={sortBy}
                onValueChange={handleSortChange}
                className="grid grid-cols-4 w-full"
              >
                <ToggleGroupItem value="date" aria-label={tUI('toggleDate')}>
                  {t('added')}
                </ToggleGroupItem>
                <ToggleGroupItem value="year" aria-label={tUI('toggleYear')}>
                  {t('year')}
                </ToggleGroupItem>
                <ToggleGroupItem value="rating" aria-label={tUI('toggleRating')}>
                  {t('rating')}
                </ToggleGroupItem>
                <ToggleGroupItem value="likes" aria-label={tUI('toggleLikes')} disabled={isSoloMode}>
                  {tUI('likes')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* FILTERING */}
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">{tUI('filterBtn')}</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={filterMode}
                onValueChange={(v) => v && setFilterMode(v)}
                className="grid grid-cols-3 w-full"
              >
                <ToggleGroupItem value="all" aria-label={tUI('everything')}>
                  {tUI('everything')}
                </ToggleGroupItem>
                <ToggleGroupItem value="session" aria-label={tUI('sessions')}>
                  {tUI('sessions')}
                </ToggleGroupItem>
                <ToggleGroupItem value="solo" aria-label={tUI('solo')}>
                  {tUI('solo')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
