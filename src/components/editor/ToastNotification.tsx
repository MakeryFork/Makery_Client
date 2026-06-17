import { useEffect } from "react";
import type { ToastType } from "./types";

interface Props {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

export function ToastNotification({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-28 left-1/2 z-[400] -translate-x-1/2 flex items-center gap-2 rounded-xl px-5 py-3 shadow-lg font-paperlogy text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-2 duration-200 ${
        type === "error" ? "bg-red-500" : "bg-[#333]"
      }`}
    >
      {message}
    </div>
  );
}
