import type { Post } from "@/lib/types";

interface Props {
  sectionTitle?: string;
  items: Post[];
  onItemClick: (post: Post) => void;
  isLoading?: boolean;
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₩${price.toLocaleString()}`;
}

export default function PopularWorksGrid({ sectionTitle, items, onItemClick, isLoading }: Props) {
  return (
    <section className="px-4 sm:px-[5%] mt-6 pb-16">
      {sectionTitle && (
        <h2 className="font-paperlogy font-semibold text-black text-lg sm:text-xl mb-6 sm:mb-8">
          {sectionTitle}
        </h2>
      )}

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square w-full rounded-[12px] bg-[#F0F0F0] mb-2" />
              <div className="h-3 w-2/3 rounded bg-[#F0F0F0] mb-1" />
              <div className="h-3 w-1/3 rounded bg-[#F0F0F0]" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-40 font-paperlogy text-[#9E9E9E]">
          No results found.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 lg:gap-6">
          {items.map((post) => (
            <button
              key={post.id}
              onClick={() => onItemClick(post)}
              className="text-left group"
            >
              <div className="relative aspect-square w-full rounded-[12px] overflow-hidden bg-[#F0F0F0] mb-2">
                {post.thumbnailUrl ? (
                  <img
                    src={post.thumbnailUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#BDBDBD]">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                )}
                {post.price > 0 && (
                  <span className="absolute bottom-1.5 right-2 font-paperlogy text-[11px] font-semibold text-white drop-shadow">
                    ₩{post.price.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="font-paperlogy text-sm text-black truncate">{post.title}</p>
              <p className="font-paperlogy text-xs text-[#BDBDBD]">{formatPrice(post.price)}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
