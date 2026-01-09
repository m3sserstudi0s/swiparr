import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useBlurData(itemId?: string, initialBlurDataURL?: string, imageType: string = "Primary") {
  const blurUrl = itemId && !initialBlurDataURL
    ? `/api/jellyfin/image/${itemId}/blur${imageType ? `?imageType=${imageType}` : ""}`
    : null;

  const { data: blurData } = useQuery({
    queryKey: ["blur", itemId, imageType],
    queryFn: async () => {
      const res = await apiClient.get(blurUrl!);
      return res.data.blurDataURL;
    },
    enabled: !!blurUrl,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });

  return initialBlurDataURL || blurData;
}
