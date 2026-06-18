import { useState } from "react";
import type { MutableRefObject } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { TimelineClip } from "@/components/editor/types";
import { isVideo } from "@/components/editor/utils";
import { getToken } from "@/lib/api";

interface Props {
  ffmpegRef: MutableRefObject<FFmpeg>;
  ffmpegLoaded: boolean;
  clips: TimelineClip[];
  onToast: (msg: string, type?: "info" | "error") => void;
}

export type ExportPhase = "idle" | "encoding" | "uploading" | "done";

export function useExport({ ffmpegRef, ffmpegLoaded, clips, onToast }: Props) {
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [exportProgress, setExportProgress] = useState(0);

  const isExporting = phase === "encoding" || phase === "uploading";
  const exportDone = phase === "done";

  const handleExportAndDownload = async () => {
    if (!ffmpegLoaded) { onToast("FFmpeg is still loading. Please wait."); return; }
    const videoClips = clips.filter((c) => isVideo(c.type));
    if (videoClips.length === 0) { onToast("No video clips to export.", "error"); return; }

    setPhase("encoding");
    setExportProgress(2);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const ffmpeg = ffmpegRef.current;
    const needsReencode = (c: TimelineClip) =>
      (c.playbackRate ?? 1) !== 1 || !!(c.effects?.rotate) || !!(c.effects?.flipH) || !!(c.effects?.flipV);

    let blob: Blob | null = null;

    try {
      for (let i = 0; i < videoClips.length; i++) {
        const c = videoClips[i];
        const outFile = `clip_${i}.mp4`;
        setExportProgress(2 + Math.round((i / videoClips.length) * 38));
        await ffmpeg.writeFile(`in_${i}.mp4`, await fetchFile(c.url));

        const trimDuration = c.trimEnd - c.trimStart;
        const rate = c.playbackRate ?? 1;
        const isTrimmed = c.trimStart > 0 || c.trimEnd < c.duration;

        if (!needsReencode(c)) {
          const cmd: string[] = [];
          if (isTrimmed) cmd.push("-ss", String(c.trimStart), "-t", String(trimDuration));
          cmd.push("-i", `in_${i}.mp4`, "-c", "copy", "-avoid_negative_ts", "make_zero", outFile);
          await ffmpeg.exec(cmd);
        } else {
          const vfFilters: string[] = [];
          const afFilters: string[] = [];
          if (rate !== 1) { vfFilters.push(`setpts=${(1 / rate).toFixed(4)}*PTS`); afFilters.push(`atempo=${Math.min(Math.max(rate, 0.5), 2)}`); }
          if (c.effects?.rotate === 90) vfFilters.push("transpose=1");
          else if (c.effects?.rotate === 180) vfFilters.push("transpose=1,transpose=1");
          else if (c.effects?.rotate === 270) vfFilters.push("transpose=2");
          if (c.effects?.flipH) vfFilters.push("hflip");
          if (c.effects?.flipV) vfFilters.push("vflip");

          const cmd: string[] = ["-ss", String(c.trimStart), "-t", String(trimDuration), "-i", `in_${i}.mp4`, "-preset", "ultrafast", "-crf", "26"];
          if (vfFilters.length > 0) cmd.push("-vf", vfFilters.join(","));
          if (afFilters.length > 0) cmd.push("-af", afFilters.join(",")); else cmd.push("-c:a", "copy");
          cmd.push("-c:v", "libx264", outFile);

          const clipBase = 40 + Math.round((i / videoClips.length) * 50);
          const clipTop = 40 + Math.round(((i + 1) / videoClips.length) * 50);
          const onProgress = ({ progress }: { progress: number }) => setExportProgress(clipBase + Math.round(progress * (clipTop - clipBase)));
          ffmpeg.on("progress", onProgress);
          await ffmpeg.exec(cmd);
          ffmpeg.off("progress", onProgress);
        }
        setExportProgress(40 + Math.round(((i + 1) / videoClips.length) * 50));
      }

      setExportProgress(92);
      let finalFile: string;
      if (videoClips.length === 1) {
        finalFile = "clip_0.mp4";
      } else {
        await ffmpeg.writeFile("concat.txt", videoClips.map((_, i) => `file 'clip_${i}.mp4'`).join("\n"));
        await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
        finalFile = "output.mp4";
      }

      setExportProgress(97);
      const data = await ffmpeg.readFile(finalFile);
      const raw = data instanceof Uint8Array ? data : new Uint8Array(0);
      const buf = new ArrayBuffer(raw.byteLength);
      new Uint8Array(buf).set(raw);
      blob = new Blob([buf], { type: "video/mp4" });

      // 로컬 다운로드
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "makery_video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setExportProgress(100);

      // 서버 업로드
      setPhase("uploading");
      const token = getToken();
      if (token && blob) {
        const formData = new FormData();
        formData.append("file", blob, "makery_video.mp4");
        await fetch("/api/v1/uploads", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      setPhase("done");
    } catch (e) {
      console.error("Export failed:", e);
      onToast("영상 내보내기에 실패했습니다. 다시 시도해주세요.", "error");
      setPhase("idle");
      setExportProgress(0);
    }
  };

  const resetExport = () => { setPhase("idle"); setExportProgress(0); };

  return { isExporting, exportProgress, exportDone, phase, handleExportAndDownload, resetExport };
}
