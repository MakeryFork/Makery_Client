import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "@/lib/api";

export default function Login() {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) navigate("/", { replace: true });
  }, [navigate]);

  const login = (provider: string) => {
    setLoading(provider);
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <img src="/logomakery.png" alt="Makery" className="h-12 mb-4 object-contain" />
      <h1 className="font-paperlogy font-bold text-2xl text-black mb-2">Sign in to Makery</h1>
      <p className="font-paperlogy text-sm text-[#9E9E9E] mb-10">
        Discover and purchase creators' works.
      </p>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => login("google")}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-paperlogy font-semibold bg-white border-2 border-[#D8D8D8] text-black hover:bg-[#F4F5F7] transition-colors disabled:opacity-60"
        >
          {loading === "google" ? (
            <div className="w-5 h-5 rounded-full border-2 border-[#D8D8D8] border-t-black animate-spin" />
          ) : (
            <img src="/google.png" alt="Google" className="w-5 h-5 object-contain" />
          )}
          {loading === "google" ? "Redirecting..." : "Continue with Google"}
        </button>

        <button
          onClick={() => login("instagram")}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl text-white font-paperlogy font-semibold bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading === "instagram" ? (
            <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : (
            <img src="/insta.png" alt="Instagram" className="w-5 h-5 object-contain" />
          )}
          {loading === "instagram" ? "Redirecting..." : "Continue with Instagram"}
        </button>
      </div>
    </div>
  );
}
