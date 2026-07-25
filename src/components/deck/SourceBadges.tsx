"use client";
import React from "react";

import { MediaItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { HardDrive } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

const MAX_VISIBLE_LOGOS = 4;

/**
 * Source row for hybrid decks: a library chip when the title is on the
 * user's media server, plus streaming service logos where it's watchable.
 */
export function SourceBadges({ item }: { item: MediaItem }) {
  const watchProviders = item.WatchProviders || [];
  if (!item.InLibrary && watchProviders.length === 0) return null;

  const visibleProviders = watchProviders.slice(0, MAX_VISIBLE_LOGOS);
  const overflowCount = watchProviders.length - visibleProviders.length;

  return (
    <>
      {item.InLibrary && (
        <Badge
          variant="secondary"
          className="gap-1 text-xs/0 bg-neutral-600/70 hover:bg-accent text-neutral-100 border-0"
        >
          <HardDrive className="w-3 h-3 mb-px" />
          Library
        </Badge>
      )}
      {visibleProviders.length > 0 && (
        <div className="flex items-center gap-1">
          {visibleProviders.map((provider) => (
            <div
              key={provider.Id}
              className="size-5 shrink-0 rounded-[4px] overflow-hidden border border-neutral-700/70"
              title={provider.Name}
            >
              <OptimizedImage
                src={`https://image.tmdb.org/t/p/w92${provider.LogoPath}`}
                alt={provider.Name}
                className="object-cover"
                unoptimized
                width={20}
                height={20}
              />
            </div>
          ))}
          {overflowCount > 0 && (
            <Badge variant="outline" className="text-xs/0 border-neutral-700/70 bg-neutral-700/20 text-neutral-100 px-1.5">
              +{overflowCount}
            </Badge>
          )}
        </div>
      )}
    </>
  );
}
