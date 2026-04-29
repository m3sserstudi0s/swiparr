"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { MediaGenre, MediaRating, MediaYear } from "@/types/media";
import { QUERY_KEYS } from "./query-keys";
import { DEFAULT_GENRES, DEFAULT_RATINGS, DEFAULT_THEMES } from "@/lib/constants";
import { getRuntimeConfig } from "@/lib/runtime-config";

function useFilterTimeoutToast(timedOut: boolean) {
  const toastShown = useRef(false);
  useEffect(() => {
    if (timedOut && !toastShown.current) {
      toastShown.current = true;
      toast.info("Using default filters", {
        description: "The media server is responding slowly, so default static filters are being used. Filters will stay fast for this session.",
        duration: 8_000,
      });
    }
  }, [timedOut]);
}

export function useFilters(open: boolean, watchRegion?: string) {
  const { tmdbDefaultRegion } = getRuntimeConfig();
  const region = watchRegion || tmdbDefaultRegion;

  const genresQuery = useQuery({
    queryKey: QUERY_KEYS.media.genres,
    queryFn: async () => {
      const res = await apiClient.get<{ data: MediaGenre[]; timedOut: boolean }>("/api/media/genres");
      return res.data ?? { data: DEFAULT_GENRES, timedOut: false };
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });

  const yearsQuery = useQuery({
    queryKey: QUERY_KEYS.media.years,
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const staticYears = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => ({
        Name: (1900 + i).toString(),
        Value: 1900 + i,
      }));
      const res = await apiClient.get<{ data: MediaYear[]; timedOut: boolean }>("/api/media/years");
      if (!res.data?.data || res.data.data.length === 0) return { data: staticYears, timedOut: res.data?.timedOut ?? false };
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });

  const ratingsQuery = useQuery({
    queryKey: QUERY_KEYS.media.ratings(region),
    queryFn: async () => {
      const res = await apiClient.get<{ data: MediaRating[]; timedOut: boolean }>(`/api/media/ratings?region=${region}`);
      if (!res.data?.data || res.data.data.length === 0) {
        return { data: DEFAULT_RATINGS.map(r => ({ Name: r, Value: r })), timedOut: res.data?.timedOut ?? false };
      }
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });

  const timedOut =
    (genresQuery.data?.timedOut ?? false) ||
    (yearsQuery.data?.timedOut ?? false) ||
    (ratingsQuery.data?.timedOut ?? false);

  useFilterTimeoutToast(timedOut);

  return {
    genres: genresQuery.data?.data ?? [],
    years: yearsQuery.data?.data ?? [],
    ratings: ratingsQuery.data?.data ?? [],
    isLoading: genresQuery.isLoading || yearsQuery.isLoading || ratingsQuery.isLoading,
  };
}

export function useThemes(open: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.media.themes,
    queryFn: async () => DEFAULT_THEMES,
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });
}
