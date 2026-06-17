import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api";
import type { UserProfile, FollowUser, Paginated } from "@/lib/types";

export function useUserProfile(id: number | null) {
  return useQuery<UserProfile>({
    queryKey: ["users", id],
    queryFn: () => api.get<UserProfile>(`/users/${id}`),
    enabled: !!id,
  });
}

export function useFollowers(userId: number | null, page = 1) {
  return useQuery<Paginated<FollowUser>>({
    queryKey: ["users", userId, "followers", page],
    queryFn: () =>
      api.get<Paginated<FollowUser>>(
        `/users/${userId}/followers?page=${page}&limit=20`
      ),
    enabled: !!userId && !!getToken(),
  });
}

export function useFollowing(userId: number | null, page = 1) {
  return useQuery<Paginated<FollowUser>>({
    queryKey: ["users", userId, "following", page],
    queryFn: () =>
      api.get<Paginated<FollowUser>>(
        `/users/${userId}/following?page=${page}&limit=20`
      ),
    enabled: !!userId && !!getToken(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      bio?: string;
      profileImageUrl?: string;
    }) => api.patch<UserProfile>("/users/me", data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
    },
  });
}

export function useFollow(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/users/${userId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useUnfollow(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/users/${userId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
