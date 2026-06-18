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
      video.preload = "auto";

      // loadeddata까지 기다려야 첫 프레임 데이터가 실제로 있음
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) { resolve(); return; }
        video.addEventListener("loadeddata", () => resolve(), { once: true });
        video.addEventListener("error", () => resolve(), { once: true });
        video.load();
      });

      if (!active) return;
      if (!video.videoWidth || !video.videoHeight) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const thumbWidth = 128;
      canvas.width = thumbWidth;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * thumbWidth) || 72;

      const count = Math.max(1, Math.ceil((c.duration * pixelsPerSecond) / thumbWidth));

      for (let i = 0; i < count; i++) {
        if (!active) break;

        const seekTime = Math.min((i * thumbWidth) / pixelsPerSecond, c.duration - 0.05);
        video.currentTime = seekTime;

        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            // seeked 직후에는 프레임이 아직 미렌더링일 수 있어서 rAF 두 번 대기
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          };
          video.addEventListener("seeked", onSeeked);
          setTimeout(resolve, 2000);
        });

        if (!active) break;

        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.6));
          if (!blob || !active) continue;
          const url = URL.createObjectURL(blob);
          setThumbnails((prev) => {
            const arr = [...(prev[c.url] ?? [])];
            arr[i] = url;
            return { ...prev, [c.url]: arr };
          });
        } catch {
          // canvas tainted or draw failed — skip
        }
      }
    });

    return () => { active = false; };
  }, [clips, pixelsPerSecond]);

  return { thumbnails };
}
