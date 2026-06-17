import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api";
import type { Post, BuyerContent, Paginated } from "@/lib/types";

interface PostsParams {
  q?: string;
  provider?: string;
  tagId?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

function buildQuery(params?: PostsParams) {
  if (!params) return "";
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.provider) p.set("provider", params.provider);
  if (params.tagId) p.set("tagId", String(params.tagId));
  if (params.minPrice !== undefined) p.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) p.set("maxPrice", String(params.maxPrice));
  if (params.page) p.set("page", String(params.page));
  if (params.limit) p.set("limit", String(params.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function usePosts(params?: PostsParams) {
  return useQuery<Paginated<Post>>({
    queryKey: ["posts", params],
    queryFn: () => api.get<Paginated<Post>>(`/posts${buildQuery(params)}`),
  });
}

export function usePost(id: number | null) {
  return useQuery<Post>({
    queryKey: ["posts", id],
    queryFn: () => api.get<Post>(`/posts/${id}`),
    enabled: !!id,
  });
}

export function useBuyerContent(postId: number | null) {
  return useQuery<BuyerContent>({
    queryKey: ["posts", postId, "buyer-content"],
    queryFn: async () => {
      const res = await api.get<{ buyerContent: BuyerContent }>(`/posts/${postId}/buyer-content`);
      return res.buyerContent;
    },
    enabled: !!postId && !!getToken(),
  });
}

export function useUserPosts(userId: number | undefined, page = 1) {
  return useQuery<Paginated<Post>>({
    queryKey: ["users", userId, "posts", page],
    queryFn: () =>
      api.get<Paginated<Post>>(
        `/users/${userId}/posts?page=${page}&limit=20`
      ),
    enabled: !!userId,
  });
}

type PostInput = {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  price: number;
  details?: { content: string; sortOrder: number }[];
  tagIds?: number[];
  buyerContent?: { title: string; markdownContent: string };
  videoProjectId?: number;
};

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostInput) => api.post<Post>("/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PostInput> }) =>
      api.patch<Post>(`/posts/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
