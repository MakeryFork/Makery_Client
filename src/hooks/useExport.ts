import { useState } from "react";
import type { MutableRefObject } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { TimelineClip } from "@/components/editor/types";
import { isVideo } from "@/components/editor/utils";

interface Props {
  ffmpegRef: MutableRefObject<FFmpeg>;
  ffmpegLoaded: boolean;
  clips: TimelineClip[];
  onToast: (msg: string, type?: "info" | "error") => void;
}

export function useExport({ ffmpegRef, ffmpegLoaded, clips, onToast }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);

  const handleExportAndDownload = async () => {
    if (!ffmpegLoaded) { onToast("FFmpeg is still loading. Please wait."); return; }
    const videoClips = clips.filter((c) => isVideo(c.type));
    if (videoClips.length === 0) { onToast("No video clips to export.", "error"); return; }

    setIsExporting(true);
    setExportProgress(2);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const ffmpeg = ffmpegRef.current;
    const needsReencode = (c: TimelineClip) =>
      (c.playbackRate ?? 1) !== 1 || !!(c.effects?.rotate) || !!(c.effects?.flipH) || !!(c.effects?.flipV);

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
      const blob = new Blob([data instanceof Uint8Array ? Uint8Array.from(data) : new Uint8Array()], { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);
      setExportProgress(100);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "makery_video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      setExportDone(true);
    } catch (e) {
      console.error("Export failed:", e);
      onToast("Failed to export video. Please try again.", "error");
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const resetExport = () => { setExportDone(false); setIsExporting(false); setExportProgress(0); };

  return { isExporting, exportProgress, exportDone, handleExportAndDownload, resetExport };
}
