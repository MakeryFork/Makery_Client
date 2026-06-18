import { useState } from "react";
import type { MutableRefObject } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { AudioClip, OverlayText, TimelineClip } from "@/components/editor/types";
import { isVideo } from "@/components/editor/utils";
import { api, getToken } from "@/lib/api";

interface PostData {
  title: string;
  description: string;
  price: number;
  thumbnailUrl?: string;
  details: { content: string; sortOrder: number }[];
}

interface Props {
  ffmpegRef: MutableRefObject<FFmpeg>;
  ffmpegLoaded: boolean;
  clips: TimelineClip[];
  texts: OverlayText[];
  audios: AudioClip[];
  videoProjectId: number | undefined;
  postId?: number;
  postData?: PostData;
  onToast: (msg: string, type?: "info" | "error") => void;
  onProjectSaved?: (id: number) => void;
  onPostSaved?: (id: number) => void;
}

export type ExportPhase = "idle" | "saving" | "encoding" | "done";

function serializeEditData(clips: TimelineClip[], texts: OverlayText[], audios: AudioClip[]) {
  const effects = clips
    .filter((c) => isVideo(c.type) && c.effects)
    .map((c) => ({
      clipId: c.id,
      filter: c.effects?.filter ?? "none",
      rotate: c.effects?.rotate ?? 0,
      flipH: c.effects?.flipH ?? false,
      flipV: c.effects?.flipV ?? false,
      playbackRate: c.playbackRate ?? 1,
    }))
    .filter((e) => e.filter !== "none" || e.rotate !== 0 || e.flipH || e.flipV || e.playbackRate !== 1);

  const serializedTexts = texts.map((t) => ({
    id: t.id, text: t.text, x: t.x, y: t.y,
    startTime: t.startTime, endTime: t.endTime,
  }));

  const serializedAudios = audios.map((a) => ({
    id: a.id, name: a.name, url: a.url,
    startTime: a.startTime, endTime: a.endTime,
  }));

  const splits = clips
    .filter((c) => isVideo(c.type) && (c.trimStart > 0 || c.trimEnd < c.duration - 0.05))
    .map((c) => ({
      clipId: c.id, trimStart: c.trimStart, trimEnd: c.trimEnd, duration: c.duration,
    }));

  return { effects, texts: serializedTexts, audios: serializedAudios, splits };
}


async function saveEditData(
  clips: TimelineClip[],
  texts: OverlayText[],
  audios: AudioClip[],
  videoProjectId: number | undefined,
  onProjectSaved?: (id: number) => void,
): Promise<number | undefined> {
  const token = getToken();
  if (!token) return undefined;

  const editData = serializeEditData(clips, texts, audios);

  if (videoProjectId) {
    await api.patch(`/video-projects/${videoProjectId}`, { editData });
    return videoProjectId;
  } else {
    const totalDuration = clips.reduce((acc, c) => {
      const rate = isVideo(c.type) ? (c.playbackRate || 1) : 1;
      return acc + (c.trimEnd - c.trimStart) / rate;
    }, 0);
    const newProject = await api.post<{ id: number }>("/video-projects", {
      title: "Makery Edit",
      duration: totalDuration,
      editData,
    });
    onProjectSaved?.(newProject.id);
    return newProject.id;
  }
}

async function downloadWithFFmpeg(
  ffmpegRef: MutableRefObject<FFmpeg>,
  clips: TimelineClip[],
  onProgress: (p: number) => void,
) {
  const ffmpeg = ffmpegRef.current;
  const videoClips = clips.filter((c) => isVideo(c.type));

  const needsReencode = (c: TimelineClip) =>
    (c.playbackRate ?? 1) !== 1 || !!(c.effects?.rotate) || !!(c.effects?.flipH) || !!(c.effects?.flipV);

  for (let i = 0; i < videoClips.length; i++) {
    const c = videoClips[i];
    const outFile = `clip_${i}.mp4`;
    onProgress(5 + Math.round((i / videoClips.length) * 40));
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

      const base = 45 + Math.round((i / videoClips.length) * 50);
      const top = 45 + Math.round(((i + 1) / videoClips.length) * 50);
      const handler = ({ progress }: { progress: number }) => onProgress(base + Math.round(progress * (top - base)));
      ffmpeg.on("progress", handler);
      await ffmpeg.exec(cmd);
      ffmpeg.off("progress", handler);
    }
    onProgress(45 + Math.round(((i + 1) / videoClips.length) * 50));
  }

  let finalFile: string;
  if (videoClips.length === 1) {
    finalFile = "clip_0.mp4";
  } else {
    await ffmpeg.writeFile("concat.txt", videoClips.map((_, i) => `file 'clip_${i}.mp4'`).join("\n"));
    await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
    finalFile = "output.mp4";
  }

  onProgress(97);
  const data = await ffmpeg.readFile(finalFile);
  const raw = data instanceof Uint8Array ? data : new Uint8Array(0);
  const buf = new ArrayBuffer(raw.byteLength);
  new Uint8Array(buf).set(raw);
  const blob = new Blob([buf], { type: "video/mp4" });

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = "makery_video.mp4";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
}

export function useExport({ ffmpegRef, ffmpegLoaded, clips, texts, audios, videoProjectId, postId, postData, onToast, onProjectSaved, onPostSaved }: Props) {
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [exportProgress, setExportProgress] = useState(0);

  const isExporting = phase === "saving" || phase === "encoding";
  const exportDone = phase === "done";

  const handleExportAndDownload = async () => {
    if (isExporting) return;

    const videoClips = clips.filter((c) => isVideo(c.type));

    setPhase("saving");
    setExportProgress(2);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    try {
      // 1단계: 편집 데이터 저장 (FFmpeg 무관)
      const savedProjectId = await saveEditData(clips, texts, audios, videoProjectId, onProjectSaved);
      setExportProgress(20);

      // 2단계: 게시물 저장/생성
      if (postData?.title && savedProjectId) {
        if (postId) {
          await api.patch(`/posts/${postId}`, { ...postData, videoProjectId: savedProjectId });
        } else {
          const newPost = await api.post<{ id: number }>("/posts", { ...postData, videoProjectId: savedProjectId });
          onPostSaved?.(newPost.id);
        }
      }
      setExportProgress(30);

      // 2단계: FFmpeg 로드됐고 영상 클립 있을 때만 다운로드
      if (ffmpegLoaded && videoClips.length > 0) {
        setPhase("encoding");
        await downloadWithFFmpeg(ffmpegRef, clips, setExportProgress);
        setExportProgress(100);
      } else if (!ffmpegLoaded) {
        onToast("편집 데이터가 저장됐습니다. (영상 다운로드는 FFmpeg 로드 후 가능합니다)", "info");
      }

      setPhase("done");
    } catch (e) {
      console.error("Export failed:", e);
      onToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
      setPhase("idle");
      setExportProgress(0);
    }
  };

  const resetExport = () => { setPhase("idle"); setExportProgress(0); };

  return { isExporting, exportProgress, exportDone, phase, handleExportAndDownload, resetExport };
}
