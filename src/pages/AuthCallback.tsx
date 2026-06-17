import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { setToken } from "@/lib/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const err = params.get("error");

    if (token) {
      setToken(token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/", { replace: true });
    } else if (err) {
      setError(err);
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, queryClient]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="font-paperlogy text-sm text-red-500">로그인 실패: {error}</p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="px-6 py-2.5 bg-[#FFCA1D] text-white font-paperlogy font-semibold rounded-xl"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-[#FFCA1D] border-t-transparent animate-spin" />
      <p className="font-paperlogy text-[#757575]">Signing in...</p>
    </div>
  );
}
