import { cn } from "@/lib/utils";

interface Props {
  url?: string | null;
  name?: string | null;
  className?: string;
}

export default function UserAvatar({ url, name, className }: Props) {
  const initial = name ? name.charAt(0).toUpperCase() : null;

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "avatar"}
        crossOrigin="anonymous"
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#757575] font-semibold select-none",
        className
      )}
    >
      {initial ?? (
        <svg
          className="w-1/2 h-1/2 text-[#BDBDBD]"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      )}
    </div>
  );
}
