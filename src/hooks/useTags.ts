import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Tag } from "@/lib/types";

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get<Tag[]>("/tags"),
    staleTime: 10 * 60 * 1000,
  });
}
