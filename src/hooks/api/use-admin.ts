import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { QUERY_KEYS } from "./query-keys";
import { MediaLibrary } from "@/types/media";

export function useAdminStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.admin.status,
    queryFn: async () => {
      const res = await apiClient.get<{ hasAdmin: boolean; isAdmin: boolean } | null>("/api/admin/status");
      return res.data;
    },
  });
}

export function useAdminConfig() {
  const { data: adminStatus } = useAdminStatus();
  return useQuery({
    queryKey: QUERY_KEYS.admin.config,
    queryFn: async () => {
      const res = await apiClient.get<{ useStaticFilterValues: boolean }>("/api/admin/config");
      return res.data;
    },
    enabled: !!adminStatus?.isAdmin,
  });
}

export function useUpdateAdminConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { useStaticFilterValues: boolean }) => {
      await apiClient.patch("/api/admin/config", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.config });
    },
  });
}

export function useMediaLibraries() {
  const { data: adminStatus } = useAdminStatus();
  return useQuery<MediaLibrary[]>({
    queryKey: QUERY_KEYS.media.libraries,
    queryFn: async () => {
      const res = await apiClient.get<MediaLibrary[]>("/api/media/libraries");
      return res.data;
    },
    enabled: !!adminStatus?.isAdmin,
    staleTime: 1000 * 60 * 60,
  });
}

export function useAdminLibraries() {
  const { data: adminStatus } = useAdminStatus();
  return useQuery<string[]>({
    queryKey: QUERY_KEYS.admin.libraries,
    queryFn: async () => {
      const res = await apiClient.get<string[]>("/api/admin/libraries");
      return res.data;
    },
    enabled: !!adminStatus?.isAdmin,
  });
}

export function useUpdateAdminLibraries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (includedLibraries: string[]) => {
      await apiClient.patch("/api/admin/libraries", includedLibraries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.libraries });
    },
  });
}

export function useClaimAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/admin/claim");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.status });
    },
  });
}
