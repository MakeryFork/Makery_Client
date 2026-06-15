import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  X,
  Play,
  Pause,
  Scissors,
  Type,
  Crop,
  Music,
  VolumeX,
  Zap,
  Gauge,
  Plus,
  Maximize2,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type { PurchaseSource } from "@/lib/types";

interface EditorStudioClip {
  type: "video" | "image";
  url: string;
  name: string;
}

interface TimelineClip {
  id: string;
  type: "video" | "image";
  url: string;
  name: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  playbackRate?: number;
  effects?: { filter: string; rotate: number; flipH: boolean; flipV: boolean };
  crop?: { x: number; y: number; w: number; h: number };
}

interface OverlayText {
  id: string;
  text: string;
  x: number;
  y: number;
  startTime: number;
  endTime: number;
}

interface AudioClip {
  id: string;
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
}

const PIXELS_PER_SECOND = 128;
const IMAGE_DURATION = 3;

const FILTERS: { name: string; value: string; css: string }[] = [
  { name: "None", value: "none", css: "" },
  { name: "Vivid", value: "vivid", css: "saturate(1.8) contrast(1.1)" },
  { name: "Warm", value: "warm", css: "sepia(0.3) saturate(1.4) brightness(1.05)" },
  { name: "Cool", value: "cool", css: "hue-rotate(20deg) saturate(0.9) brightness(1.05)" },
  { name: "B&W", value: "grayscale", css: "grayscale(1)" },
  { name: "Sepia", value: "sepia", css: "sepia(0.8)" },
  { name: "Invert", value: "invert", css: "invert(1)" },
  { name: "Blur", value: "blur", css: "blur(2px)" },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function CreateEditorStudio() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    clips?: EditorStudioClip[];
    projectId?: number;
    templateSources?: PurchaseSource[];
  } | null;

  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [texts, setTexts] = useState<OverlayText[]>([]);
  const [audios, setAudios] = useState<AudioClip[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipIdx, setSelectedClipIdx] = useState<number | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [ffmpegReady, setFfmpegReady] = useState(false);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const rafRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const totalDuration = clips.reduce(
    (acc, c) => acc + (c.trimEnd - c.trimStart),
    0
  );

  // Initialize from location state
  useEffect(() => {
    if (!state?.clips?.length && !state?.projectId) {
      navigate("/create/editor", { replace: true });
      return;
    }

    const initClips = async () => {
      const initialClips: TimelineClip[] = [];
      for (const c of state?.clips ?? []) {
        let duration = IMAGE_DURATION;
        if (c.type === "video") {
          duration = await new Promise<number>((resolve) => {
            const v = document.createElement("video");
            v.src = c.url;
            v.onloadedmetadata = () => resolve(v.duration);
            v.onerror = () => resolve(5);
          });
        }
        initialClips.push({
          id: uid(),
          type: c.type,
          url: c.url,
          name: c.name,
          duration,
          trimStart: 0,
          trimEnd: duration,
          effects: { filter: "none", rotate: 0, flipH: false, flipV: false },
        });
      }
      setClips(initialClips);

      // Apply template sources
      if (state?.templateSources) {
        const newTexts: OverlayText[] = [];
        const newAudios: AudioClip[] = [];
        for (const src of state.templateSources) {
          if (src.type === "animation" && src.properties.text) {
            newTexts.push({
              id: uid(),
              text: src.properties.text as string,
              x: 50,
              y: 50,
              startTime: src.startTime,
              endTime: src.endTime,
            });
          } else if (src.type === "audio" && src.properties.url) {
            newAudios.push({
              id: uid(),
              url: src.properties.url as string,
              name: src.properties.name as string ?? "Audio",
              duration: src.endTime - src.startTime,
              startTime: src.startTime,
              endTime: src.endTime,
            });
          }
        }
        setTexts(newTexts);
        setAudios(newAudios);
      }

      setIsInitializing(false);
    };

    setTimeout(() => initClips(), 200);
  }, []);

  // Load FFmpeg
  useEffect(() => {
    const load = async () => {
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegRef.current = ffmpeg;
      setFfmpegReady(true);
    };
    load().catch(console.error);
  }, []);

  // Playback loop
  const getCurrentClipAndOffset = useCallback(
    (time: number) => {
      let elapsed = 0;
      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        const dur = c.trimEnd - c.trimStart;
        if (time <= elapsed + dur) {
          return { clip: c, index: i, offset: time - elapsed };
        }
        elapsed += dur;
      }
      return null;
    },
    [clips]
  );

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let lastTs: number | null = null;
    const loop = (ts: number) => {
      if (lastTs !== null) {
        const dt = (ts - lastTs) / 1000;
        setCurrentTime((prev) => {
          const next = prev + dt;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      lastTs = ts;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, totalDuration]);

  // Sync video elements
  useEffect(() => {
    const info = getCurrentClipAndOffset(currentTime);
    clips.forEach((clip, i) => {
      const el = videoRefs.current.get(clip.id);
      if (!el) return;
      if (info?.index === i) {
        const target = clip.trimStart + info.offset;
        if (Math.abs(el.currentTime - target) > 0.1) el.currentTime = target;
        el.playbackRate = clip.playbackRate ?? 1;
        el.muted = isMuted;
        if (isPlaying) el.play().catch(() => {});
        else el.pause();
      } else {
        el.pause();
      }
    });
  }, [currentTime, isPlaying, isMuted, clips, getCurrentClipAndOffset]);

  // Sync audio elements
  useEffect(() => {
    audios.forEach((a) => {
      const el = audioRefs.current.get(a.id);
      if (!el) return;
      el.muted = isMuted;
      if (isPlaying && currentTime >= a.startTime && currentTime <= a.endTime) {
        const offset = currentTime - a.startTime;
        if (Math.abs(el.currentTime - offset) > 0.2) el.currentTime = offset;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [currentTime, isPlaying, isMuted, audios]);

  // Timeline scroll → currentTime
  const handleTimelineScroll = (e: React.WheelEvent) => {
    if (isPlaying) return;
    const delta = e.deltaX || e.deltaY;
    setCurrentTime((prev) =>
      Math.max(0, Math.min(totalDuration, prev + delta / PIXELS_PER_SECOND))
    );
  };

  const handleSplit = () => {
    const info = getCurrentClipAndOffset(currentTime);
    if (!info) return;
    const { clip, index, offset } = info;
    if (offset < 0.1 || clip.trimEnd - clip.trimStart - offset < 0.1) return;

    const splitAt = clip.trimStart + offset;
    const clipA: TimelineClip = { ...clip, id: uid(), trimEnd: splitAt };
    const clipB: TimelineClip = { ...clip, id: uid(), trimStart: splitAt };
    setClips((prev) => [
      ...prev.slice(0, index),
      clipA,
      clipB,
      ...prev.slice(index + 1),
    ]);
  };

  const handleAddText = () => {
    const newText: OverlayText = {
      id: uid(),
      text: "Text",
      x: 50,
      y: 50,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, totalDuration),
    };
    setTexts((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  const handleAddAudio = (file: File) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.src = url;
    audio.onloadedmetadata = () => {
      const newAudio: AudioClip = {
        id: uid(),
        url,
        name: file.name,
        duration: audio.duration,
        startTime: currentTime,
        endTime: currentTime + audio.duration,
      };
      setAudios((prev) => [...prev, newAudio]);
    };
  };

  const handleAddClip = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(async (file) => {
      let duration = IMAGE_DURATION;
      const url = URL.createObjectURL(file);
      if (file.type.startsWith("video/")) {
        duration = await new Promise<number>((resolve) => {
          const v = document.createElement("video");
          v.src = url;
          v.onloadedmetadata = () => resolve(v.duration);
          v.onerror = () => resolve(5);
        });
      }
      setClips((prev) => [
        ...prev,
        {
          id: uid(),
          type: file.type.startsWith("video/") ? "video" : "image",
          url,
          name: file.name,
          duration,
          trimStart: 0,
          trimEnd: duration,
          effects: { filter: "none", rotate: 0, flipH: false, flipV: false },
        },
      ]);
    });
  };

  const handleExport = async () => {
    if (!ffmpegRef.current || !ffmpegReady) {
      alert("FFmpeg is not loaded yet.");
      return;
    }
    const videoClips = clips.filter((c) => c.type === "video");
    if (!videoClips.length) {
      alert("No video clips to export.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on("progress", ({ progress }) => {
        setExportProgress(Math.round(progress * 100));
      });

      const outputParts: string[] = [];

      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i];
        const inFile = `in_${i}.mp4`;
        const outFile = `clip_${i}.mp4`;
        await ffmpeg.writeFile(inFile, await fetchFile(clip.url));

        const vfParts: string[] = [];
        vfParts.push(`setpts=${1 / (clip.playbackRate ?? 1)}*PTS`);

        const eff = clip.effects;
        if (eff?.rotate) vfParts.push(`transpose=${eff.rotate === 90 ? 1 : 2}`);
        if (eff?.flipH) vfParts.push("hflip");
        if (eff?.flipV) vfParts.push("vflip");

        const filterCss = FILTERS.find((f) => f.value === eff?.filter)?.css ?? "";
        const vfString = vfParts.join(",");

        const afParts: string[] = [];
        if ((clip.playbackRate ?? 1) !== 1) {
          afParts.push(`atempo=${clip.playbackRate ?? 1}`);
        }

        const duration = clip.trimEnd - clip.trimStart;
        const args = [
          "-ss", String(clip.trimStart),
          "-t", String(duration),
          "-i", inFile,
          "-preset", "ultrafast",
          "-vf", vfString,
          ...(afParts.length ? ["-af", afParts.join(",")] : []),
          "-c:v", "libx264",
          "-c:a", "aac",
          outFile,
        ];

        await ffmpeg.exec(args);
        outputParts.push(outFile);
        void filterCss;
      }

      let finalFile = outputParts[0];
      if (outputParts.length > 1) {
        const listContent = outputParts.map((f) => `file '${f}'`).join("\n");
        const encoder = new TextEncoder();
        await ffmpeg.writeFile("list.txt", encoder.encode(listContent));
        await ffmpeg.exec([
          "-f", "concat",
          "-safe", "0",
          "-i", "list.txt",
          "-c", "copy",
          "final.mp4",
        ]);
        finalFile = "final.mp4";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData: any = await ffmpeg.readFile(finalFile);
      const uint8 = rawData instanceof Uint8Array ? rawData : new Uint8Array(rawData);
      const blob = new Blob([uint8], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "makery-export.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Current clip for preview
  const info = getCurrentClipAndOffset(currentTime);
  const currentClip = info ? clips[info.index] : null;

  // Playhead position
  let elapsed = 0;
  for (let i = 0; i < (info?.index ?? 0); i++) {
    elapsed += clips[i].trimEnd - clips[i].trimStart;
  }
  const playheadX = currentTime * PIXELS_PER_SECOND;

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#FFCA1D] border-t-transparent animate-spin" />
        <p className="font-paperlogy text-white text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#111] flex flex-col text-white font-paperlogy overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 bg-[#1A1A1A] border-b border-[#2A2A2A] flex-shrink-0">
        <button
          onClick={() => navigate("/create/editor")}
          className="p-1.5 hover:bg-[#2A2A2A] rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold">Video Editor</span>
        <button
          onClick={handleExport}
          disabled={isExporting || clips.length === 0}
          className="px-4 py-1.5 bg-[#FFCA1D] text-black text-sm font-semibold rounded-lg hover:bg-[#e6b800] transition-colors disabled:opacity-50"
        >
          {isExporting ? `${exportProgress}%` : "upload"}
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden min-h-0">
        {clips.map((clip) => {
          const isActive = currentClip?.id === clip.id;
          const eff = clip.effects;
          const filterCss = FILTERS.find((f) => f.value === eff?.filter)?.css ?? "";
          const style: React.CSSProperties = {
            display: isActive ? "block" : "none",
            filter: filterCss || undefined,
            transform: [
              eff?.rotate ? `rotate(${eff.rotate}deg)` : "",
              eff?.flipH ? "scaleX(-1)" : "",
              eff?.flipV ? "scaleY(-1)" : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined,
          };

          return clip.type === "video" ? (
            <video
              key={clip.id}
              ref={(el) => {
                if (el) videoRefs.current.set(clip.id, el);
                else videoRefs.current.delete(clip.id);
              }}
              src={clip.url}
              className="max-w-full max-h-full object-contain"
              style={style}
              muted={isMuted}
            />
          ) : (
            <img
              key={clip.id}
              src={clip.url}
              alt={clip.name}
              className="max-w-full max-h-full object-contain"
              style={style}
            />
          );
        })}

        {/* Text overlays */}
        {texts.map((t) => {
          const visible = currentTime >= t.startTime && currentTime <= t.endTime;
          if (!visible) return null;
          return (
            <div
              key={t.id}
              className="absolute cursor-move select-none"
              style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-50%)" }}
              onDoubleClick={() => {
                const newText = prompt("Edit text", t.text);
                if (newText !== null) {
                  setTexts((prev) =>
                    prev.map((tx) => (tx.id === t.id ? { ...tx, text: newText } : tx))
                  );
                }
              }}
            >
              <span className="text-white text-2xl font-bold drop-shadow-lg">
                {t.text}
              </span>
            </div>
          );
        })}

        {/* Export overlay */}
        {isExporting && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#333" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none" stroke="#FFCA1D" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - exportProgress / 100)}`}
                  className="transition-all duration-200"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {exportProgress}%
              </span>
            </div>
            <p className="text-sm text-[#9E9E9E]">Exporting...</p>
          </div>
        )}
      </div>

      {/* Transport bar */}
      <div className="flex items-center justify-center gap-6 h-12 bg-[#1A1A1A] border-t border-[#2A2A2A] flex-shrink-0">
        <button className="p-1.5 text-[#9E9E9E] hover:text-white transition-colors" title="Undo (not implemented)">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsPlaying((v) => !v)}
          className="p-2 bg-[#FFCA1D] text-black rounded-full hover:bg-[#e6b800] transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button className="p-1.5 text-[#9E9E9E] hover:text-white transition-colors" title="Redo (not implemented)">
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="h-40 bg-[#161616] border-t border-[#2A2A2A] overflow-x-auto flex-shrink-0 relative"
        onWheel={handleTimelineScroll}
      >
        <div
          style={{ width: Math.max(totalDuration * PIXELS_PER_SECOND + 200, 600) }}
          className="relative h-full"
        >
          {/* Ruler */}
          <div className="h-6 flex items-end bg-[#1A1A1A] border-b border-[#2A2A2A]">
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-start"
                style={{ left: i * PIXELS_PER_SECOND }}
              >
                <span className="text-[9px] text-[#555] pl-1">{i}s</span>
                <div className="w-px h-2 bg-[#333]" />
              </div>
            ))}
          </div>

          {/* Video track */}
          <div className="h-14 flex items-center px-1 relative">
            {clips.map((clip, i) => {
              const w = (clip.trimEnd - clip.trimStart) * PIXELS_PER_SECOND;
              let left = 0;
              for (let j = 0; j < i; j++) {
                left += (clips[j].trimEnd - clips[j].trimStart) * PIXELS_PER_SECOND;
              }
              return (
                <div
                  key={clip.id}
                  onClick={() => setSelectedClipIdx(i)}
                  className={`absolute top-1 bottom-1 rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                    selectedClipIdx === i
                      ? "border-[#FFCA1D]"
                      : "border-transparent hover:border-[#555]"
                  }`}
                  style={{ left, width: w, backgroundColor: "#2A2A2A" }}
                >
                  {clip.type === "image" ? (
                    <img src={clip.url} alt="" className="w-full h-full object-cover opacity-70" />
                  ) : (
                    <video src={clip.url} className="w-full h-full object-cover opacity-70" muted />
                  )}
                  <div className="absolute inset-0 flex items-end px-1 pb-0.5">
                    <span className="text-[9px] text-white/70 truncate">{clip.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Text track */}
          {texts.length > 0 && (
            <div className="h-7 flex items-center px-1 relative">
              {texts.map((t) => (
                <div
                  key={t.id}
                  className="absolute top-0.5 bottom-0.5 bg-[#FFCA1D]/80 rounded cursor-pointer flex items-center px-1"
                  style={{
                    left: t.startTime * PIXELS_PER_SECOND,
                    width: (t.endTime - t.startTime) * PIXELS_PER_SECOND,
                  }}
                  onClick={() => setSelectedTextId(t.id)}
                >
                  <span className="text-[9px] text-black truncate">{t.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Audio track */}
          {audios.length > 0 && (
            <div className="h-7 flex items-center px-1 relative">
              {audios.map((a) => (
                <div
                  key={a.id}
                  className="absolute top-0.5 bottom-0.5 bg-green-600/80 rounded flex items-center px-1"
                  style={{
                    left: a.startTime * PIXELS_PER_SECOND,
                    width: Math.max((a.endTime - a.startTime) * PIXELS_PER_SECOND, 30),
                  }}
                >
                  <span className="text-[9px] text-white truncate">{a.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[#FFCA1D] z-10 pointer-events-none"
            style={{ left: playheadX }}
          />
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="h-16 bg-[#1A1A1A] border-t border-[#2A2A2A] flex items-center justify-center gap-3 flex-shrink-0">
        {[
          { icon: <Scissors className="w-5 h-5" />, label: "Split", action: handleSplit },
          { icon: <Type className="w-5 h-5" />, label: "Text", action: handleAddText },
          { icon: <Crop className="w-5 h-5" />, label: "Ratio", action: () => setActiveTool(activeTool === "crop" ? null : "crop") },
          {
            icon: <Music className="w-5 h-5" />,
            label: "Audio",
            action: () => audioFileRef.current?.click(),
          },
          { icon: <VolumeX className="w-5 h-5" />, label: "Mute", action: () => setIsMuted((v) => !v) },
          {
            icon: <Zap className="w-5 h-5" />,
            label: "Effects",
            action: () => setActiveTool(activeTool === "effects" ? null : "effects"),
          },
          {
            icon: <Gauge className="w-5 h-5" />,
            label: "Speed",
            action: () => setActiveTool(activeTool === "speed" ? null : "speed"),
          },
          { icon: <Plus className="w-5 h-5" />, label: "Add", action: () => addFileRef.current?.click() },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors ${
              (btn.label === "Mute" && isMuted) ||
              (btn.label === "Ratio" && activeTool === "crop") ||
              (btn.label === "Effects" && activeTool === "effects") ||
              (btn.label === "Speed" && activeTool === "speed")
                ? "text-[#FFCA1D] bg-[#FFCA1D]/10"
                : "text-[#9E9E9E] hover:text-white hover:bg-[#2A2A2A]"
            }`}
          >
            {btn.icon}
            <span className="text-[9px]">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Speed popup */}
      {activeTool === "speed" && selectedClipIdx !== null && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 z-30">
          <p className="text-xs text-[#9E9E9E] mb-3 text-center">Playback Speed</p>
          <div className="flex gap-2">
            {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  const clip = clips[selectedClipIdx];
                  if (clip.type === "image") {
                    return;
                  }
                  setClips((prev) =>
                    prev.map((c, i) =>
                      i === selectedClipIdx ? { ...c, playbackRate: rate } : c
                    )
                  );
                  setActiveTool(null);
                }}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  clips[selectedClipIdx]?.playbackRate === rate ||
                  (rate === 1 && !clips[selectedClipIdx]?.playbackRate)
                    ? "bg-[#FFCA1D] text-black"
                    : "bg-[#2A2A2A] text-white hover:bg-[#333]"
                }`}
              >
                {rate}×
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Effects popup */}
      {activeTool === "effects" && selectedClipIdx !== null && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 z-30">
          <p className="text-xs text-[#9E9E9E] mb-3 text-center">Filter</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setClips((prev) =>
                    prev.map((c, i) =>
                      i === selectedClipIdx
                        ? { ...c, effects: { ...c.effects!, filter: f.value } }
                        : c
                    )
                  );
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  clips[selectedClipIdx]?.effects?.filter === f.value
                    ? "bg-[#FFCA1D] text-black"
                    : "bg-[#2A2A2A] text-white hover:bg-[#333]"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={addFileRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => handleAddClip(e.target.files)}
      />
      <input
        ref={audioFileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleAddAudio(e.target.files[0])}
      />

      {/* Audio elements */}
      {audios.map((a) => (
        <audio
          key={a.id}
          ref={(el) => {
            if (el) audioRefs.current.set(a.id, el);
            else audioRefs.current.delete(a.id);
          }}
          src={a.url}
          muted={isMuted}
        />
      ))}

      {/* Keyboard delete for clips */}
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Backspace" || e.key === "Delete") && selectedClipIdx !== null) {
            setClips((prev) => prev.filter((_, i) => i !== selectedClipIdx));
            setSelectedClipIdx(null);
          }
        }}
        className="sr-only"
      />
    </div>
  );
}
