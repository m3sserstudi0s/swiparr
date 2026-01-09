import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MergedLike } from "@/types";
import { QUERY_KEYS } from "./query-keys";

export function useLikes(sortBy = "date", filterMode = "all") {
  return useQuery<MergedLike[]>({
    queryKey: [...QUERY_KEYS.likes, sortBy, filterMode],
    queryFn: async () => {
      const res = await apiClient.get<MergedLike[]>("/api/user/likes", {
        params: { sortBy, filter: filterMode }
      });
      return res.data;
    },
  });
}
