import { useEffect, useRef, useState } from "react";
import type { TimelineClip } from "@/components/editor/types";
import { isVideo } from "@/components/editor/utils";

export function useThumbnails(clips: TimelineClip[], pixelsPerSecond: number) {
  const [thumbnails, setThumbnails] = useState<Record<string, string[]>>({});
  const thumbnailCache = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    clips.forEach(async (c) => {
      if (!isVideo(c.type) || c.duration <= 0 || thumbnailCache.current.has(c.url)) return;
      thumbnailCache.current.add(c.url);

      const video = document.createElement("video");
      video.src = c.url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      await new Promise((resolve) => { video.onloadeddata = resolve; video.onerror = resolve; });
      if (!active) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const thumbWidth = 128;
      canvas.width = thumbWidth;
      canvas.height = (video.videoHeight / video.videoWidth) * thumbWidth || 72;
      const count = Math.max(1, Math.ceil((c.duration * pixelsPerSecond) / thumbWidth));

      for (let i = 0; i < count; i++) {
        if (!active) break;
        video.currentTime = i * (thumbWidth / pixelsPerSecond);
        await new Promise((resolve) => {
          video.addEventListener("seeked", () => resolve(null), { once: true });
          setTimeout(resolve, 800);
        });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.5));
        if (!blob || !active) break;
        const url = URL.createObjectURL(blob);
        setThumbnails((prev) => {
          const arr = [...(prev[c.url] ?? [])];
          arr[i] = url;
          return { ...prev, [c.url]: arr };
        });
      }
    });
    return () => { active = false; };
  }, [clips, pixelsPerSecond]);

  return { thumbnails };
}
