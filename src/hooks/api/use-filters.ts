import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MediaGenre, MediaRating, MediaYear } from "@/types/media";
import { QUERY_KEYS } from "./query-keys";
import { DEFAULT_GENRES, DEFAULT_RATINGS, DEFAULT_THEMES, TMDB_DEFAULT_REGION } from "@/lib/constants";

export function useFilters(open: boolean, watchRegion?: string) {
  const region = watchRegion || TMDB_DEFAULT_REGION;

  const genresQuery = useQuery({
    queryKey: QUERY_KEYS.media.genres,
    queryFn: async () => {
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
  return useQuery({
    queryKey: QUERY_KEYS.media.themes,
    queryFn: async () => DEFAULT_THEMES,
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });
}
