import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PopularWorksGrid from "@/components/PopularWorksGrid";
import PostDetailModal from "@/components/PostDetailModal";
import { usePosts } from "@/hooks/usePosts";
import type { Post } from "@/lib/types";

type AppFilter = "all" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "TIKTOK";

const APP_OPTIONS: { value: AppFilter; label: string }[] = [
  { value: "all", label: "All Apps" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "TIKTOK", label: "TikTok" },
];

export default function Explore() {
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = usePosts({
    q: query || undefined,
    provider: appFilter !== "all" ? appFilter : undefined,
    limit: 20,
  });

  const triggerLabel = APP_OPTIONS.find((o) => o.value === appFilter)?.label ?? "Apps";

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      {/* Search bar */}
      <section className="mt-4 px-4 sm:px-[5%] lg:mt-6">
        <div className="mx-auto flex max-w-5xl items-center gap-4 rounded-full border border-[#E8E8E8] bg-white py-2.5 pl-4 pr-5 shadow-sm sm:gap-5 sm:py-3 sm:pl-5 sm:pr-7">
          <Search className="h-5 w-5 shrink-0 text-[#BDBDBD]" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search here.."
            className="min-w-0 flex-1 bg-transparent font-paperlogy text-base text-[#4A4A4A] outline-none placeholder:text-[#BDBDBD] sm:text-lg"
          />
          <div className="relative ml-1 shrink-0 pl-2 sm:ml-2 sm:pl-3" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 py-1 pr-1 font-paperlogy text-base text-[#4A4A4A] sm:gap-2.5 sm:pr-2 sm:text-lg"
            >
              <img
                src="/explore-apps-mark.png"
                alt=""
                className="h-4 w-auto shrink-0 object-contain sm:h-[18px]"
              />
              <span className="max-w-[9.5rem] truncate sm:max-w-[11rem]">{triggerLabel}</span>
              <img
                src="/explore-dropdown-chevron.png"
                alt=""
                className={`h-2.5 w-auto transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {menuOpen && (
              <ul className="absolute right-0 top-[calc(100%+10px)] z-30 min-w-[220px] rounded-lg border border-[#EEEEEE] bg-white py-2 shadow-lg">
                {APP_OPTIONS.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-paperlogy text-sm text-black hover:bg-[#F8F8F8] sm:text-base"
                      onClick={() => { setAppFilter(opt.value); setMenuOpen(false); }}
                    >
                      <span className="flex w-5 shrink-0 items-center justify-center">
                        {appFilter === opt.value && (
                          <img src="/explore-apps-mark.png" alt="" className="h-3.5 w-auto object-contain" />
                        )}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <PopularWorksGrid
        sectionTitle="Popular Works"
        items={data?.items ?? []}
        onItemClick={setSelectedPost}
        isLoading={isLoading}
      />

      <PostDetailModal
        post={selectedPost}
        open={selectedPost != null}
        onOpenChange={(open) => { if (!open) setSelectedPost(null); }}
      />
    </div>
  );
}
