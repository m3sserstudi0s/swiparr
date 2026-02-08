import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { QUERY_KEYS } from "./query-keys";
import { WatchProvider, MediaRegion } from "@/types/media";

export interface UserSettings {
  watchProviders: string[];
  watchRegion: string;
  isNew?: boolean;
}

export function useUserSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.user.settings,
    queryFn: async () => {
      const res = await apiClient.get<UserSettings>("/api/user/settings");
      return res.data;
    },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      await apiClient.patch("/api/user/settings", settings);
    },
    onSuccess: async (_, variables) => {
      // Invalidate user settings first
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user.settings });

      // Get the current session to find the session code
      const currentSession = queryClient.getQueryData<any>(QUERY_KEYS.session);
      const sessionCode = currentSession?.code;

      // Invalidate session
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });

      // Invalidate ratings for the new region
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.ratings(variables.watchRegion) });

      // Force a complete refresh of the deck - remove ALL deck queries
      queryClient.removeQueries({ queryKey: ["deck"] });
      if (sessionCode) {
        queryClient.removeQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
      }

      // Also invalidate watch providers
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.media.watchProviders("", null) });

      // Then force refetch of deck to ensure it reloads
      if (sessionCode) {
        queryClient.refetchQueries({ queryKey: QUERY_KEYS.deck(sessionCode) });
      }
      queryClient.refetchQueries({ queryKey: ["deck"] });
    },
  });
}

export function useWatchProviders(region: string, sessionCode?: string | null, all: boolean = false) {
  return useQuery({
    queryKey: [...QUERY_KEYS.media.watchProviders(region, sessionCode), all],
    queryFn: async () => {
      const res = await apiClient.get<{ providers: (WatchProvider & { MemberUserIds?: string[] })[], members?: any[] }>("/api/media/watch-providers", {
        params: { region, sessionCode, all },
      });
      return res.data;
    },
    enabled: !!region,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: QUERY_KEYS.media.regions,
    queryFn: async () => {
      const res = await apiClient.get<MediaRegion[]>("/api/media/regions");
      return res.data;
    },
  });
}
