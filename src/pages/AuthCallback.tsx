import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { setToken } from "@/lib/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setToken(token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, queryClient]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-[#FFCA1D] border-t-transparent animate-spin" />
      <p className="font-paperlogy text-[#757575]">Signing in...</p>
    </div>
  );
}
