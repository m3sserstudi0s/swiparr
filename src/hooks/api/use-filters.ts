import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MediaGenre, MediaRating, MediaYear } from "@/types/media";
import { QUERY_KEYS } from "./query-keys";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { useSession } from "./use-session";
import { DEFAULT_GENRES, DEFAULT_RATINGS } from "@/lib/constants";

export function useFilters(open: boolean, watchRegion?: string) {
  const { useStaticFilterValues, capabilities } = useRuntimeConfig();
  const isExternal = !capabilities.hasAuth;
  const region = watchRegion || "SE";

  const genresQuery = useQuery({
    queryKey: QUERY_KEYS.media.genres,
    queryFn: async () => {
      if (useStaticFilterValues && !isExternal) return DEFAULT_GENRES;
      const res = await apiClient.get<MediaGenre[]>("/api/media/genres");
      if (!res.data || res.data.length === 0) return DEFAULT_GENRES;
      return res.data;
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
        Value: 1900 + i 
      }));

      if (useStaticFilterValues && !isExternal) {
        return staticYears;
      }
      const res = await apiClient.get<MediaYear[]>("/api/media/years");
      if (!res.data || res.data.length === 0) return staticYears;
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });

  const ratingsQuery = useQuery({
    queryKey: QUERY_KEYS.media.ratings(region),
    queryFn: async () => {
      if (useStaticFilterValues && !isExternal) {
         return DEFAULT_RATINGS.map(r => ({ Name: r, Value: r }));
      }
      const res = await apiClient.get<MediaRating[]>(`/api/media/ratings?region=${region}`);
      // Fallback if provider returns empty or fails (e.g. TMDB might not have dynamic maturity ratings)
      if (!res.data || res.data.length === 0) {
          return DEFAULT_RATINGS.map(r => ({ Name: r, Value: r }));
      }
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });

  return {
    genres: genresQuery.data || [],
    years: yearsQuery.data || [],
    ratings: ratingsQuery.data || [],
    isLoading: genresQuery.isLoading || yearsQuery.isLoading || ratingsQuery.isLoading,
  };
}

export function useThemes(open: boolean) {
  const { useStaticFilterValues, capabilities } = useRuntimeConfig();
  const isExternal = !capabilities.hasAuth;

  return useQuery({
    queryKey: QUERY_KEYS.media.themes,
    queryFn: async () => {
      if (useStaticFilterValues && !isExternal) {
          return [
              "Christmas",
              "Halloween",
              "Summer",
              "Action-Packed",
              "Date Night"
          ];
      }
      const res = await apiClient.get<string[]>("/api/media/themes");
      if (!res.data || res.data.length === 0) {
        return [];
      }
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });
}
