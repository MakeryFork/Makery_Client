import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

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
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useUnfollow(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/users/${userId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
