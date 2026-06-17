import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  Music,
  Sparkles,
  Type,
  Scissors,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PostDetailModal from "@/components/PostDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { useMyPurchases, usePurchaseSources } from "@/hooks/usePurchases";
import { api } from "@/lib/api";
import type { Post, SourcesResponse, TemplateSources } from "@/lib/types";

interface DisplaySource {
  id: string;
  label: string;
  category: "Effect" | "Text" | "Audio" | "Animation" | "Split";
  timeLabel?: string;
  downloadUrl?: string;
}

function toDisplaySources(ts: TemplateSources): DisplaySource[] {
  const items: DisplaySource[] = [];
  ts.effects?.forEach((e, i) =>
    items.push({
      id: `e${i}`,
      label: e.filter ? `Filter: ${e.filter}` : `Effect (clip ${e.clipId})`,
      category: "Effect",
    })
  );
  ts.texts?.forEach((t) =>
    items.push({
      id: t.id,
      label: `"${t.text.length > 24 ? t.text.slice(0, 24) + "…" : t.text}"`,
      category: "Text",
      timeLabel: `${t.startTime.toFixed(1)}s – ${t.endTime.toFixed(1)}s`,
    })
  );
  ts.audios?.forEach((a) =>
    items.push({
      id: a.id,
      label: a.name,
      category: "Audio",
      timeLabel: `${a.startTime.toFixed(1)}s – ${a.endTime.toFixed(1)}s`,
      downloadUrl: a.url,
    })
  );
  ts.animations?.forEach((a, i) =>
    items.push({
      id: `anim${i}`,
      label: a.type,
      category: "Animation",
      timeLabel: `${a.startTime.toFixed(1)}s – ${a.endTime.toFixed(1)}s`,
    })
  );
  ts.splits?.forEach((s, i) =>
    items.push({
      id: `split${i}`,
      label: `Split at ${s.time.toFixed(1)}s (clip ${s.clipIndex})`,
      category: "Split",
    })
  );
  return items;
}

function SourceRow({ source }: { source: DisplaySource }) {
  const Icon =
    source.category === "Audio"
      ? Music
      : source.category === "Animation"
      ? Sparkles
      : source.category === "Text"
      ? Type
      : source.category === "Split"
      ? Scissors
      : CheckCircle2;

  const bg =
    source.category === "Audio"
      ? "bg-[#F0F8F0]"
      : source.category === "Animation"
      ? "bg-[#FFF9E6]"
      : source.category === "Text"
      ? "bg-[#F0F4FF]"
      : "bg-[#F4F5F7]";

  const iconColor =
    source.category === "Audio"
      ? "text-[#4CAF50]"
      : source.category === "Animation"
      ? "text-[#FFCA1D]"
      : source.category === "Text"
      ? "text-[#5B8FF9]"
      : "text-[#888]";

  const handleDownload = async () => {
    if (!source.downloadUrl) return;
    try {
      const res = await fetch(source.downloadUrl);
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = source.label;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dlUrl), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <li className={`flex items-center gap-2 rounded-lg px-3 py-2 ${bg}`}>
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} strokeWidth={1.5} />
      <span className="flex-1 truncate font-paperlogy text-xs text-[#555]">
        {source.label}
      </span>
      {source.timeLabel && (
        <span className="shrink-0 font-paperlogy text-[10px] text-[#BDBDBD]">
          {source.timeLabel}
        </span>
      )}
      {source.downloadUrl ? (
        <button
          type="button"
          onClick={handleDownload}
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-black/5 ${iconColor} transition-colors hover:bg-black/10`}
        >
          <Download className="h-3 w-3" strokeWidth={2} />
        </button>
      ) : (
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-[#BDBDBD]"
          strokeWidth={1.5}
        />
      )}
    </li>
  );
}

function SourceCard({
  post,
  onSelect,
}: {
  post: Post;
  onSelect: () => void;
}) {
  const navigate = useNavigate();
  const [showSources, setShowSources] = useState(false);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);

  const { data: sourcesData, isLoading: isLoadingSources } = usePurchaseSources(
    showSources && post.videoProjectId ? post.id : null
  );

  const displaySources: DisplaySource[] =
    sourcesData ? toDisplaySources(sourcesData.templateSources) : [];

  const handleOpenInEditor = async () => {
    setIsOpeningEditor(true);
    try {
      const data = await api.get<SourcesResponse>(`/purchases/${post.id}/sources`);
      navigate("/create/editor", {
        state: { templateSources: data.templateSources },
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
            onClick={() => setShowSources((v) => !v)}
            className="flex items-center justify-between rounded-lg border border-[#E5E8EB] bg-white px-3 py-2 font-paperlogy text-xs font-semibold text-[#555] transition-colors hover:bg-[#F4F5F7]"
          >
            <span className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {isLoadingSources
                ? "Loading..."
                : showSources && displaySources.length > 0
                ? `Sources (${displaySources.length})`
                : "View Sources"}
            </span>
            {showSources ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#BDBDBD]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#BDBDBD]" />
            )}
          </button>

          {showSources && (
            <div className="rounded-xl border border-[#E5E8EB] bg-white px-3 pb-2">
              {isLoadingSources ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FFCA1D] border-t-transparent" />
                </div>
              ) : displaySources.length === 0 ? (
                <p className="py-3 text-center font-paperlogy text-xs text-[#BDBDBD]">
                  No source assets.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 py-2">
                  {displaySources.map((s) => (
                    <SourceRow key={s.id} source={s} />
                  ))}
                </ul>
              )}
            </div>
          )}

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
