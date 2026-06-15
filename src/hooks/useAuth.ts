import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, clearToken, getToken } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: user,
    isLoading,
  } = useQuery<UserProfile>({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<UserProfile>("/auth/me"),
    enabled: !!getToken(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = () => {
    clearToken();
    queryClient.removeQueries({ queryKey: ["auth"] });
    navigate("/login");
  };

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    logout,
  };
}
