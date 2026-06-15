import { useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import PopularWorksGrid from "@/components/PopularWorksGrid";
import PostDetailModal from "@/components/PostDetailModal";
import { usePosts } from "@/hooks/usePosts";
import type { Post } from "@/lib/types";

export default function Index() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { data, isLoading } = usePosts({ limit: 20 });

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      {/* Hero Banner */}
      <section className="px-4 sm:px-[4.5%] mt-2 sm:mt-3 lg:mt-4">
        <div className="relative w-full rounded-[16px] lg:rounded-[22px] overflow-hidden h-[340px] sm:h-[400px] lg:h-[510px]">
          <img
            src="/Frame 3465361.png"
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-10 flex items-end justify-center pb-7 sm:pb-9 lg:pb-11">
            <Link
              to="/create"
              className="inline-flex rounded-full bg-[#BEE2FF] px-8 py-3 font-paperlogy text-base font-bold text-white shadow-md transition-colors hover:bg-[#a8d4f7] sm:px-10 sm:py-4 sm:text-lg lg:px-14 lg:py-4 lg:text-xl"
            >
              Create Now!
            </Link>
          </div>
        </div>
      </section>

      <PopularWorksGrid
        sectionTitle="Popular Projects"
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
