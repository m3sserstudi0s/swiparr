"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { MediaGenre, MediaRating, MediaYear } from "@/types/media";
import { QUERY_KEYS } from "./query-keys";
import { DEFAULT_GENRES, DEFAULT_RATINGS, DEFAULT_THEMES } from "@/lib/constants";
import { getRuntimeConfig } from "@/lib/runtime-config";

const STATIC_FILTERS_README_URL =
  "https://github.com/m3sserstudi0s/swiparr?tab=readme-ov-file#environment-variable-matrix";

function useFilterTimeoutToast(timedOut: boolean) {
  const toastShown = useRef(false);
  useEffect(() => {
    if (timedOut && !toastShown.current) {
      toastShown.current = true;
      toast.warning("Filter loading timed out", {
        description: "Static filters are being used. For large libraries, consider enabling USE_STATIC_FILTERS.",
        duration: 10_000,
        action: (
          <a
            href={STATIC_FILTERS_README_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            See <ExternalLink className="h-3 w-3" />
          </a>
        ),
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
