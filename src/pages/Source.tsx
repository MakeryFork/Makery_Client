import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PostDetailModal from "@/components/PostDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { useMyPurchases } from "@/hooks/usePurchases";
import { api } from "@/lib/api";
import type { Post, SourcesResponse } from "@/lib/types";


function SourceCard({
  post,
  onSelect,
}: {
  post: Post;
  onSelect: () => void;
}) {
  const navigate = useNavigate();
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);

  const handleOpenInEditor = async () => {
    setIsOpeningEditor(true);
    try {
      const data = await api.get<SourcesResponse>(`/purchases/${post.id}/sources`);
      navigate("/create/editor", {
        state: {
          templateSources: data.templateSources,
          projectId: data.videoProjectId,
        },
      });
    } catch {
      navigate("/create/editor", { state: {} });
    } finally {
      setIsOpeningEditor(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onSelect}
        className="relative aspect-square w-full rounded-[12px] overflow-hidden bg-[#F0F0F0] mb-2 hover:opacity-90 transition-opacity"
      >
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#BDBDBD]">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
        {post.videoProjectId && (
          <div className="absolute top-2 right-2 rounded-full bg-[#FFCA1D] px-2 py-0.5 font-paperlogy text-[10px] font-bold text-white shadow">
            SOURCE
          </div>
        )}
      </button>

      <p className="font-paperlogy text-sm text-black truncate mb-2">
        {post.title}
      </p>

      {post.videoProjectId && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleOpenInEditor}
            disabled={isOpeningEditor}
            className="rounded-lg bg-[#FFCA1D] px-3 py-1.5 font-paperlogy text-xs font-semibold text-white hover:bg-[#e6b800] transition-colors disabled:opacity-50 w-full"
          >
            {isOpeningEditor ? "Loading..." : "Open in Editor"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Source() {
  const { isLoggedIn } = useAuth();
  const { data, isLoading } = useMyPurchases();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const purchases = data?.items ?? [];
  const purchasedPosts = purchases.map((p) => p.post);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      {/* Banner */}
      <section className="px-4 sm:px-[4.5%] mt-2 sm:mt-3 lg:mt-4">
        <div className="relative w-full rounded-[16px] lg:rounded-[22px] overflow-hidden h-[340px] sm:h-[400px] lg:h-[510px]">
          <img
            src="/source-banner.png"
            alt="with Makery — Explore more posts"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center sm:bottom-7 lg:bottom-10">
            <Link
              to="/explore"
              className="inline-flex rounded-full bg-[#FFE079] px-8 py-3 font-paperlogy text-base font-bold text-white shadow-md transition-colors hover:bg-[#f2d56d] sm:px-10 sm:py-3.5 sm:text-lg lg:px-14 lg:py-4 lg:text-xl"
            >
              Explore Now!
            </Link>
          </div>
        </div>
      </section>

      {!isLoggedIn ? (
        <div className="py-20 text-center">
          <p className="font-paperlogy text-[#9E9E9E]">
            Sign in to see your purchases.
          </p>
        </div>
      ) : (
        <section className="px-4 sm:px-[5%] mt-6 pb-16">
          <h2 className="font-paperlogy font-semibold text-black text-lg sm:text-xl mb-6 sm:mb-8">
            Purchase History
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square w-full rounded-[12px] bg-[#F0F0F0] mb-2" />
                  <div className="h-3 w-2/3 rounded bg-[#F0F0F0]" />
                </div>
              ))}
            </div>
          ) : purchasedPosts.length === 0 ? (
            <p className="text-center font-paperlogy text-[#9E9E9E] py-12">
              No purchases yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {purchasedPosts.map((post) => (
                <SourceCard
                  key={post.id}
                  post={post}
                  onSelect={() => setSelectedPost(post)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <PostDetailModal
        post={selectedPost}
        open={selectedPost != null}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
        isPurchased
      />
    </div>
  );
}
