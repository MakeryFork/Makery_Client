import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerContent } from "@/hooks/usePosts";
import { useCreatePurchase, useDirectPurchase, useImportVideo } from "@/hooks/usePurchases";
import UserAvatar from "./UserAvatar";
import type { Post } from "@/lib/types";

interface Props {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPurchased?: boolean;
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₩${price.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostDetailModal({ post, open, onOpenChange, isPurchased }: Props) {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [buyError, setBuyError] = useState("");
  const [purchased, setPurchased] = useState(false);

  const isOwner = user?.id === post?.author?.id;
  const showBuyerContent = isPurchased || purchased;

  const { data: buyerContent } = useBuyerContent(showBuyerContent ? post?.id ?? null : null);

  const createPurchase = useCreatePurchase();
  const directPurchase = useDirectPurchase();
  const importVideo = useImportVideo();

  const handleBuy = async () => {
    if (!post) return;
    setBuyError("");

    if (!isLoggedIn) {
      navigate("/login");
      onOpenChange(false);
      return;
    }

    try {
      if (post.price === 0) {
        await directPurchase.mutateAsync(post.id);
        setPurchased(true);
      } else {
        await createPurchase.mutateAsync({
          postId: post.id,
          price: post.price,
          title: post.title,
        });
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Purchase failed.");
    }
  };

  const handleImport = () => {
    if (!post) return;
    importVideo.mutate(post.id);
    onOpenChange(false);
  };

  if (!post) return null;

  const isBuying = createPurchase.isPending || directPurchase.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[min(94vw,1280px)] h-[min(88vh,680px)] bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Close button */}
          <Dialog.Close className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-[#F0F0F0] transition-colors">
            <X className="w-5 h-5" />
          </Dialog.Close>

          <div className="flex flex-col md:flex-row flex-1 min-h-0">

            {/* Left: 이미지 + 하단 프로필/버튼 바 */}
            <div className="md:w-[55%] shrink-0 flex flex-col min-h-0">
              {/* 이미지 */}
              <div className="flex-1 min-h-0 bg-[#F4F5F7] flex items-center justify-center overflow-hidden">
                {post.thumbnailUrl ? (
                  <img
                    src={post.thumbnailUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-[#BDBDBD]">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-paperlogy text-sm">No image</p>
                  </div>
                )}
              </div>

              {/* 하단 바: 프로필 + 구매 버튼 */}
              <div className="shrink-0 flex items-center justify-between gap-4 px-5 py-4 border-t border-[#F0F0F0] bg-white">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    url={post.author?.profileImageUrl}
                    name={post.author?.name}
                    className="w-9 h-9 text-sm"
                  />
                  <div>
                    <p className="font-paperlogy font-semibold text-sm text-black leading-tight">
                      {post.author?.name}
                    </p>
                    <p className="font-paperlogy text-xs text-[#9E9E9E]">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>

                {!showBuyerContent && !isOwner && (
                  <button
                    onClick={handleBuy}
                    disabled={isBuying}
                    className="shrink-0 px-6 py-2 rounded-xl bg-[#FFCA1D] text-white font-paperlogy text-sm font-semibold hover:bg-[#e6b800] transition-colors disabled:opacity-60"
                  >
                    {isBuying ? "Processing..." : "Buy Now"}
                  </button>
                )}
                {isOwner && post.videoProjectId && (
                  <button
                    onClick={() => {
                      navigate("/create/editor/studio", { state: { projectId: post.videoProjectId } });
                      onOpenChange(false);
                    }}
                    className="shrink-0 px-5 py-2 rounded-xl border-2 border-[#FFCA1D] text-[#FFCA1D] font-paperlogy text-sm font-semibold hover:bg-[#FFCA1D]/10 transition-colors"
                  >
                    Edit in Studio
                  </button>
                )}
                {buyError && <p className="text-red-500 text-xs font-paperlogy">{buyError}</p>}
              </div>
            </div>

            {/* Right: 내용 */}
            <div className="flex-1 p-7 overflow-y-auto">
              {showBuyerContent && buyerContent ? (
                <div data-color-mode="light">
                  <h2 className="font-paperlogy font-bold text-xl text-black mb-4">
                    {buyerContent.title}
                  </h2>
                  <MarkdownPreview
                    source={buyerContent.markdownContent}
                    style={{ background: "transparent" }}
                  />
                  {post.videoProjectId && (
                    <button
                      onClick={handleImport}
                      disabled={importVideo.isPending}
                      className="mt-6 w-full py-3 rounded-xl bg-[#FFCA1D] text-white font-paperlogy font-semibold hover:bg-[#e6b800] transition-colors disabled:opacity-60"
                    >
                      {importVideo.isPending ? "Importing..." : "Import to Editor"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* 제목 */}
                  <h2 className="font-paperlogy font-bold text-2xl text-black leading-snug">
                    {post.title}
                  </h2>

                  {/* 설명 */}
                  {post.description && (
                    <p className="font-paperlogy text-sm text-[#757575] leading-relaxed">
                      {post.description}
                    </p>
                  )}

                  {/* 가격 */}
                  <div className="flex items-center justify-between py-4 border-t border-b border-[#F0F0F0]">
                    <span className="font-paperlogy text-sm text-[#757575]">Price</span>
                    <span className="font-paperlogy font-bold text-lg text-black">
                      {post.price === 0 ? "Free" : `₩ ${post.price.toLocaleString()}`}
                    </span>
                  </div>

                  {/* Details */}
                  {(post.postDetails?.length ?? 0) > 0 && (
                    <ol className="space-y-2">
                      {post.postDetails
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((d, i) => (
                          <li key={d.id} className="flex items-start gap-2 font-paperlogy text-sm text-[#555]">
                            <span className="shrink-0 text-[#9E9E9E]">{i + 1}.</span>
                            {d.content}
                          </li>
                        ))}
                    </ol>
                  )}

                  {/* Tags */}
                  {post.postTags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {post.postTags.map(({ tag }) => (
                        <span key={tag.id} className="px-3 py-1 bg-[#F4F5F7] rounded-full font-paperlogy text-xs text-[#757575]">
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 text-xs text-[#BDBDBD] font-paperlogy">
                    <span>Views {post.viewCount}</span>
                    <span>Purchases {post._count.purchases}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
