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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user.settings });
      // Also invalidate deck as settings changed
      queryClient.invalidateQueries({ queryKey: ["deck"] });
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
