import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <h1 className="font-paperlogy font-bold text-6xl text-[#FFCA1D]">404</h1>
      <p className="font-paperlogy text-[#757575]">Page not found.</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-3 bg-[#FFCA1D] text-white font-paperlogy font-semibold rounded-xl hover:bg-[#e6b800] transition-colors"
      >
        Back to Home
      </button>
    </div>
  );
}
