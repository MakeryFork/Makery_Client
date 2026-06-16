import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { label: "HOME", path: "/" },
  { label: "EXPLORE", path: "/explore" },
  { label: "CREATE", path: "/create" },
  { label: "SOURCE", path: "/source" },
  { label: "MYPAGE", path: "/mypage" },
];

const NAV_GAP = "gap-10 sm:gap-16 lg:gap-[140px] xl:gap-[min(10vw,200px)]";

export default function AppHeader() {
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white">
      {/* Top row: logo centered, user right */}
      <div className="relative flex items-center justify-center h-[60px] lg:h-[80px] border-b border-[#F6F8FA]">
        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
          <img
            src="/logomakery.png"
            alt="Makery"
            className="h-[40px] lg:h-[56px] w-auto object-contain"
          />
        </Link>
        <div className="absolㅇute right-0 flex items-center h-full px-6 lg:px-8">
          {isLoggedIn ? (
            <button
              onClick={() => navigate("/mypage")}
              className="text-[#757575] font-paperlogy text-sm lg:text-base hover:text-[#FFCA1D] transition-colors"
            >
              {user!.name}
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-[#757575] font-paperlogy text-sm lg:text-base hover:text-[#FFCA1D] transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Nav row */}
      <nav
        className={`flex justify-center items-center h-[45px] lg:h-[50px] border-b border-[#EDF2F5] overflow-x-auto px-4 scrollbar-none ${NAV_GAP}`}
      >
        {NAV_ITEMS.map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            className={[
              "font-paperlogy text-sm lg:text-[18px] tracking-wide flex-shrink-0 transition-colors",
              isActive(path)
                ? "text-[#FFCA1D]"
                : "text-[#757575] hover:text-[#FFCA1D]",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
