"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CaretDown,
  Check,
  Play,
} from "@phosphor-icons/react/dist/ssr";
import { MediaItem } from "@/types";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { startHereHeading, type StartHereResult } from "@/lib/start-here";
import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * Series detail: commitment numbers, where to start, and the seasons/episodes.
 *
 * Deliberately additive to the movie detail view instead of a rewrite: a series
 * needs progress data and a season list the movie view has no place for, and the
 * movie view is the most-used surface in the app.
 */

interface Props {
  series: MediaItem;
}

interface ChildrenResponse {
  kind: "season" | "episode";
  items: MediaItem[];
}

interface StartHereResponse {
  startHere: StartHereResult;
  episodeCount: number;
  hostOnly: boolean;
}

/**
 * "3 seasons · 24 episodes · ~18 h" — the commitment question the card has to
 * answer. Hours come from the episode runtimes, so they only appear once the
 * episodes are loaded; a series row alone carries no total runtime.
 */
const commitmentLine = (series: MediaItem, episodes?: MediaItem[]): string | null => {
  const parts: string[] = [];
  if (series.SeasonCount) parts.push(`${series.SeasonCount} season${series.SeasonCount === 1 ? "" : "s"}`);
  if (series.EpisodeCount) parts.push(`${series.EpisodeCount} episode${series.EpisodeCount === 1 ? "" : "s"}`);

  const totalMinutes = (episodes ?? []).reduce(
    (sum, episode) => sum + (episode.EpisodeRuntimeMinutes ?? 0),
    0
  );
  if (totalMinutes >= 60) parts.push(`~${Math.round(totalMinutes / 60)} h`);

  return parts.length > 0 ? parts.join(" · ") : null;
};

const statusLabel = (status: MediaItem["Status"]) => {
  if (status === "continuing") return "Continuing";
  if (status === "ended") return "Ended";
  if (status === "upcoming") return "Upcoming";
  return null;
};

export function SeriesDetailSection({ series }: Props) {
  const [openSeasons, setOpenSeasons] = useState<number[]>([]);
  // A provider without watch state cannot answer "where are you": asking it for a
  // start-here position would print S1E1 under a heading that claims progress.
  const knowsProgress = getRuntimeConfig().capabilities.hasProgress;

  const { data: seasons, isLoading: isLoadingSeasons } = useQuery({
    queryKey: ["series-seasons", series.Id],
    queryFn: async () => {
      const res = await apiClient.get<ChildrenResponse>("/api/media/children", {
        params: { seriesId: series.Id, kind: "season" },
      });
      return res.data.items;
    },
  });

  const { data: episodes, isLoading: isLoadingEpisodes } = useQuery({
    queryKey: ["series-episodes", series.Id],
    queryFn: async () => {
      const res = await apiClient.get<ChildrenResponse>("/api/media/children", {
        params: { seriesId: series.Id, kind: "episode" },
      });
      return res.data.items;
    },
  });

  const { data: startHere } = useQuery({
    queryKey: ["series-start-here", series.Id],
    queryFn: async () => {
      const res = await apiClient.get<StartHereResponse>("/api/media/start-here", {
        params: { seriesId: series.Id },
      });
      return res.data;
    },
    // A provider without series support answers 501, and one without watch
    // state has no position to report; either way the section simply hides.
    retry: false,
    enabled: knowsProgress,
  });

  const episodesBySeason = useMemo(() => {
    const grouped = new Map<number, MediaItem[]>();
    for (const episode of episodes ?? []) {
      const season = episode.SeasonNumber ?? 1;
      const list = grouped.get(season) ?? [];
      list.push(episode);
      grouped.set(season, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => (a.EpisodeNumber ?? 0) - (b.EpisodeNumber ?? 0));
    }
    return grouped;
  }, [episodes]);

  const toggleSeason = (season: number) => {
    setOpenSeasons((prev) =>
      prev.includes(season) ? prev.filter((value) => value !== season) : [...prev, season]
    );
  };

  const commitment = commitmentLine(series, episodes);
  const status = statusLabel(series.Status);
  const startHereTitle = startHere?.startHere
    ? startHereHeading({ action: startHere.startHere.action, hostOnly: startHere.hostOnly })
    : null;

  return (
    <section className="mt-2 mb-8">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {commitment && (
          <span className="text-xs text-muted-foreground">
            {commitment}
          </span>
        )}
        {status && (
          <Badge variant="meta">
            {status}
          </Badge>
        )}
      </div>

      {knowsProgress && startHere?.startHere && startHereTitle && (
        <div className="border border-border p-4 mb-6">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            {startHereTitle}
          </div>
          <div className="flex items-center gap-2">
            <Play weight="fill" className="size-4" />
            <span className="text-sm font-medium">{startHere.startHere.label}</span>
          </div>
          {startHere.startHere.warning && (
            <div className="text-xs text-muted-foreground mt-1">{startHere.startHere.warning}</div>
          )}
        </div>
      )}

      {(isLoadingSeasons || isLoadingEpisodes) && (
        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!isLoadingSeasons && !isLoadingEpisodes && (
        <div className="border-t border-border">
          {(seasons ?? []).map((season) => {
            const seasonNumber = season.SeasonNumber ?? 1;
            const seasonEpisodes = episodesBySeason.get(seasonNumber) ?? [];
            const isOpen = openSeasons.includes(seasonNumber);
            const watched = seasonEpisodes.filter((episode) => episode.Progress?.played).length;

            return (
              <div key={season.Id} className="border-b border-border">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 py-3 text-left"
                  onClick={() => toggleSeason(seasonNumber)}
                >
                  <span className="flex items-baseline gap-3 min-w-0">
                    <span className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">
                      {String(seasonNumber).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium truncate">{season.Name}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground">
                      {watched}/{seasonEpisodes.length || season.EpisodeCount || 0}
                    </span>
                    <CaretDown
                      className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    />
                  </span>
                </button>

                {isOpen && seasonEpisodes.length > 0 && (
                  <ul className="pb-3">
                    {seasonEpisodes.map((episode) => (
                      <li
                        key={episode.Id}
                        className="flex items-center gap-3 py-1.5 pl-8 text-sm"
                      >
                        <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground w-8 shrink-0">
                          E{episode.EpisodeNumber ?? "?"}
                        </span>
                        <span className={cn("flex-1 truncate", episode.Progress?.played && "text-muted-foreground")}>
                          {episode.Name}
                        </span>
                        {episode.Progress?.played && <Check className="size-3.5 shrink-0 text-muted-foreground" />}
                        {typeof episode.EpisodeRuntimeMinutes === "number" && (
                          <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground shrink-0">
                            {episode.EpisodeRuntimeMinutes} min
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {isOpen && seasonEpisodes.length === 0 && (
                  <div className="pb-3 pl-8 text-xs text-muted-foreground">No episodes listed</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
