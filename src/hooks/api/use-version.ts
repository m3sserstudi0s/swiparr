import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useVersion() {
  return useQuery({
    queryKey: ["version"],
    queryFn: async () => {
      const res = await apiClient.get<{ version: string; error?: string }>("/api/version");
      return res.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
