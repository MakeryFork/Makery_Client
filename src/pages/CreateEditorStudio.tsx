import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Crop,
  ImagePlus,
  Maximize2,
  Music,
  Redo2,
  Scissors,
  Sparkles,
  Type,
  Undo2,
  VolumeX,
  CircleGauge,
  Play,
  Pause,
  Loader2,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { EditorStudioClip, EditorStudioLocationState } from "./CreateEditorMediaPicker";
import type { PurchaseSource } from "@/lib/types";
import ExportProgressModal from "@/components/ExportProgressModal";

function isVideo(t: string) {
  return t === "video" || t.startsWith("video/");
}


type ToastType = "info" | "error";

function ToastNotification({ message, type, onDismiss }: {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-28 left-1/2 z-[400] -translate-x-1/2 flex items-center gap-2 rounded-xl px-5 py-3 shadow-lg font-paperlogy text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-2 duration-200 ${type === "error" ? "bg-red-500" : "bg-[#333]"
        }`}
    >
      {message}
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type CropData = { x: number, y: number, w: number, h: number };
type FilterPreset = 'none' | 'grayscale' | 'sepia' | 'invert' | 'warm' | 'cool' | 'vivid' | 'blur';
type ClipEffects = { rotate: 0 | 90 | 180 | 270; flipH: boolean; flipV: boolean; filter: FilterPreset };
type TimelineClip = EditorStudioClip & { duration: number, trimStart: number, trimEnd: number, id: string, crop?: CropData, playbackRate?: number, effects?: ClipEffects };
type OverlayText = { id: string, text: string, x: number, y: number, startTime: number, endTime: number };
type AudioClip = { id: string, url: string, name: string, duration: number, startTime: number, endTime: number };

const FILTER_PRESETS: { key: FilterPreset; label: string; css: string }[] = [
  { key: 'none', label: 'Normal', css: '' },
  { key: 'vivid', label: 'Vivid', css: 'saturate(180%) contrast(110%)' },
  { key: 'warm', label: 'Warm', css: 'sepia(30%) saturate(150%) hue-rotate(-10deg)' },
  { key: 'cool', label: 'Cool', css: 'saturate(80%) hue-rotate(20deg) brightness(1.05)' },
  { key: 'grayscale', label: 'B&W', css: 'grayscale(100%)' },
  { key: 'sepia', label: 'Sepia', css: 'sepia(80%)' },
  { key: 'invert', label: 'Invert', css: 'invert(100%)' },
  { key: 'blur', label: 'Blur', css: 'blur(4px)' },
];

function defaultEffects(): ClipEffects { return { rotate: 0, flipH: false, flipV: false, filter: 'none' }; }

function getEffectStyle(effects?: ClipEffects): React.CSSProperties {
  if (!effects) return {};
  const transforms: string[] = [];
  if (effects.rotate) transforms.push(`rotate(${effects.rotate}deg)`);
  if (effects.flipH) transforms.push('scaleX(-1)');
  if (effects.flipV) transforms.push('scaleY(-1)');
  const filterCss = FILTER_PRESETS.find(f => f.key === effects.filter)?.css ?? '';
  return {
    ...(transforms.length ? { transform: transforms.join(' ') } : {}),
    ...(filterCss ? { filter: filterCss } : {}),
  };
}

function CropOverlay({ initialCrop, onSave, onCancel }: { initialCrop?: CropData, onSave: (c: CropData) => void, onCancel: () => void }) {
  const [crop, setCrop] = useState<CropData>(initialCrop || { x: 10, y: 10, w: 80, h: 80 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ startX: number, startY: number, initCrop: CropData } | null>(null);

  useEffect(() => {
    if (!draggingHandle) return;
    const onMove = (e: PointerEvent) => {
      if (!containerRef.current || !dragStartRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
      const { initCrop } = dragStartRef.current;

      setCrop(() => {
        let { x, y, w, h } = initCrop;

        if (draggingHandle === 'move') {
          x += dx;
          y += dy;
        } else if (draggingHandle === 'tl') {
          x += dx; y += dy; w -= dx; h -= dy;
        } else if (draggingHandle === 'tr') {
          y += dy; w += dx; h -= dy;
        } else if (draggingHandle === 'bl') {
          x += dx; w -= dx; h += dy;
        } else if (draggingHandle === 'br') {
          w += dx; h += dy;
        }

        if (w < 5) w = 5;
        if (h < 5) h = 5;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + w > 100) {
          if (draggingHandle === 'move') x = 100 - w;
          else w = 100 - x;
        }
        if (y + h > 100) {
          if (draggingHandle === 'move') y = 100 - h;
          else h = 100 - y;
        }

        return { x, y, w, h };
      });
    };
    const onUp = () => setDraggingHandle(null);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
  }, [draggingHandle]);

  const handlePointerDown = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, initCrop: crop };
    setDraggingHandle(handle);
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto" ref={containerRef}>
      <div
        className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move touch-none"
        style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%` }}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      >
        <div className="absolute -left-2 -top-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, 'tl')} />
        <div className="absolute -right-2 -top-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, 'tr')} />
        <div className="absolute -left-2 -bottom-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, 'bl')} />
        <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, 'br')} />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-black/40 p-2 rounded-xl backdrop-blur-md">
        <button className="px-5 py-2 bg-[#FFCA1D] text-[#333] font-bold rounded-lg text-sm transition-transform hover:scale-105" onClick={() => onSave(crop)}>Apply</button>
        <button className="px-5 py-2 bg-white text-black font-bold rounded-lg text-sm transition-transform hover:scale-105" onClick={() => onSave({ x: 0, y: 0, w: 100, h: 100 })}>Reset</button>
        <button className="px-5 py-2 bg-black/50 text-white font-bold rounded-lg text-sm transition-transform hover:scale-105" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function DraggableText({ textItem, onUpdate }: { textItem: OverlayText, onUpdate: (t: OverlayText) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: textItem.x,
      initY: textItem.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onUpdate({ ...textItem, x: dragRef.current.initX + dx, y: dragRef.current.initY + dy });
    };
    const handlePointerUp = () => setIsDragging(false);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, textItem, onUpdate]);

  if (isEditing) {
    return (
      <input
        autoFocus
        className="absolute z-50 text-white font-paperlogy text-3xl font-bold bg-black/40 outline-none border border-white/50 px-2 py-1 rounded shadow-lg"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${textItem.x}px), calc(-50% + ${textItem.y}px))`,
          textShadow: '0 2px 4px rgba(0,0,0,0.8)'
        }}
        value={textItem.text}
        onChange={(e) => onUpdate({ ...textItem, text: e.target.value })}
        onBlur={() => setIsEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false) }}
      />
    );
  }

  return (
    <div
      className={`absolute cursor-move select-none z-50 text-white font-paperlogy text-3xl font-bold px-2 py-1 rounded transition-shadow ${isDragging ? 'ring-2 ring-white/80 bg-white/10' : 'hover:ring-1 hover:ring-white/50'}`}
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${textItem.x}px), calc(-50% + ${textItem.y}px))`,
        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
        whiteSpace: 'nowrap'
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
    >
      {textItem.text}
    </div>
  );
}

export default function CreateEditorStudio() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as EditorStudioLocationState | undefined;
  const initialClips = state?.clips ?? [];
  const templateSources: PurchaseSource[] = state?.templateSources ?? [];

  const [clips, setClips] = useState<TimelineClip[]>(() =>
    initialClips.map((c, i) => ({
      ...c,
      id: `${i}-${Date.now()}`,
      duration: isVideo(c.type) ? 0 : 3, // photos default to 3s
      trimStart: 0,
      trimEnd: isVideo(c.type) ? 0 : 3,
    }))
  );

  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCropping, setIsCropping] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isEffectsOpen, setIsEffectsOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string[]>>({});
  const [texts, setTexts] = useState<OverlayText[]>(() =>
    templateSources
      .filter((s) => s.type === "animation" && s.properties?.text)
      .map((s) => ({
        id: `tpl-${s.startTime}`,
        text: String(s.properties.text ?? ""),
        x: Number(s.properties.x ?? 0),
        y: Number(s.properties.y ?? 0),
        startTime: s.startTime,
        endTime: s.endTime,
      }))
  );
  const [audios, setAudios] = useState<AudioClip[]>(() =>
    templateSources
      .filter((s) => s.type === "audio" && s.properties?.url)
      .map((s) => ({
        id: `tpl-audio-${s.startTime}`,
        url: String(s.properties.url),
        name: String(s.properties.name ?? "Audio"),
        duration: s.endTime - s.startTime,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
  );
  const [isMuted, setIsMuted] = useState(false);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const thumbnailCache = useRef<Set<string>>(new Set());

  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);

  const PIXELS_PER_SECOND = 128;
  const videoMaxDuration = Math.ceil(clips.reduce((acc, c) => {
    const rate = isVideo(c.type) ? (c.playbackRate || 1) : 1;
    return acc + (c.trimEnd - c.trimStart) / rate;
  }, 0));
  const maxTextDuration = texts.length > 0 ? Math.max(...texts.map(t => t.endTime)) : 0;
  const maxAudioDuration = audios.length > 0 ? Math.max(...audios.map(a => a.endTime)) : 0;
  const maxDuration = Math.max(videoMaxDuration, Math.ceil(maxTextDuration), Math.ceil(maxAudioDuration));

  const loadFFmpeg = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    const ffmpeg = ffmpegRef.current;

    // Listen to log and progress
    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setFfmpegLoaded(true);
    } catch (e) {
      console.error("FFmpeg load error:", e);
      showToast("Export engine failed to load. Refresh the page and try again.", "error");
    }
  };

  useEffect(() => {
    loadFFmpeg();
    if (!clips.length) {
      navigate("/create/editor", { replace: true });
    }
  }, [clips.length, navigate]);

  const hasUnloadedVideo = clips.some(c => isVideo(c.type) && c.duration === 0);

  useEffect(() => {
    if (!hasUnloadedVideo) return;
    const loadDurations = async () => {
      const newClips = await Promise.all(clips.map(async (c) => {
        if (isVideo(c.type) && c.duration === 0) {
          return new Promise<TimelineClip>((resolve) => {
            const v = document.createElement("video");
            v.preload = "metadata";
            const fallback = setTimeout(() => resolve({ ...c, duration: 5, trimEnd: 5 }), 8000);
            v.onloadedmetadata = () => { clearTimeout(fallback); resolve({ ...c, duration: v.duration, trimEnd: v.duration }); };
            v.onerror = () => { clearTimeout(fallback); resolve({ ...c, duration: 5, trimEnd: 5 }); };
            v.src = c.url;
          });
        }
        return c;
      }));
      setClips(newClips);
    };
    loadDurations();
  }, [hasUnloadedVideo, clips]);

  // Thumbnail generator
  useEffect(() => {
    let active = true;

    clips.forEach(async (c) => {
      if (isVideo(c.type) && c.duration > 0 && !thumbnailCache.current.has(c.url)) {
        thumbnailCache.current.add(c.url);

        const video = document.createElement("video");
        video.src = c.url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";

        await new Promise((resolve) => {
          video.onloadeddata = resolve;
          video.onerror = resolve;
        });

        if (!active) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const thumbWidth = 128;
        canvas.width = thumbWidth;
        canvas.height = (video.videoHeight / video.videoWidth) * thumbWidth || 72;

        const numThumbnails = Math.max(1, Math.ceil((c.duration * PIXELS_PER_SECOND) / thumbWidth));
        const urls: string[] = new Array(numThumbnails).fill("");

        for (let i = 0; i < numThumbnails; i++) {
          if (!active) break;
          const time = i * (thumbWidth / PIXELS_PER_SECOND);
          video.currentTime = time;

          await new Promise((resolve) => {
            const onSeeked = () => resolve(null);
            video.addEventListener('seeked', onSeeked, { once: true });
            setTimeout(resolve, 800);
          });

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.5));
          if (blob) {
            urls[i] = URL.createObjectURL(blob);
          }

          if (!active) break;
          setThumbnails(prev => {
            const existing = prev[c.url] || [];
            const newArr = [...existing];
            newArr[i] = urls[i];
            return { ...prev, [c.url]: newArr };
          });
        }
      }
    });

    return () => {
      active = false;
    };
  }, [clips, PIXELS_PER_SECOND]);

  useEffect(() => {
    if (clips.length > 0 && !clips.some(c => isVideo(c.type) && c.duration === 0)) {
      const timer = setTimeout(() => setIsInitializing(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [clips]);

  useEffect(() => {
    return () => {
      audioRefs.current.forEach((el) => { el.pause(); el.src = ""; });
    };
  }, []);

  // Keyboard shortcut for deleting selected items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedClipIndex !== null) {
          setClips(prev => prev.filter((_, i) => i !== selectedClipIndex));
          setSelectedClipIndex(null);
        } else if (selectedTextId !== null) {
          setTexts(prev => prev.filter(t => t.id !== selectedTextId));
          setSelectedTextId(null);
        } else if (selectedAudioId !== null) {
          const el = audioRefs.current.get(selectedAudioId);
          if (el) { el.pause(); el.src = ""; audioRefs.current.delete(selectedAudioId); }
          setAudios(prev => prev.filter(a => a.id !== selectedAudioId));
          setSelectedAudioId(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIndex, selectedTextId, selectedAudioId]);

  const loop = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    let newTime = currentTimeRef.current + deltaTime;

    if (newTime >= maxDuration) {
      newTime = maxDuration;
      setIsPlaying(false);
    }

    currentTimeRef.current = newTime;
    setCurrentTime(newTime);

    if (timelineRef.current) {
      timelineRef.current.scrollLeft = newTime * PIXELS_PER_SECOND;
    }

    if (newTime < maxDuration) {
      requestRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      // If at the end, restart
      if (currentTimeRef.current >= maxDuration) {
        currentTimeRef.current = 0;
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(console.error);
        }
      }
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(loop);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = 0;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!isPlaying && currentTimeRef.current >= maxDuration) {
      currentTimeRef.current = 0;
    }
    setIsPlaying(!isPlaying);
  };

  const handleScroll = () => {
    if (!isPlaying && timelineRef.current) {
      const time = timelineRef.current.scrollLeft / PIXELS_PER_SECOND;
      currentTimeRef.current = time;
      setCurrentTime(time);
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    }
  };

  // 템플릿 효과 목록 (클립 인덱스 순서대로 적용)
  const templateEffects = templateSources
    .filter((s) => s.type === "effect")
    .map((s) => ({
      filter: (s.properties.filter as FilterPreset) ?? "none",
      rotate: (Number(s.properties.rotate ?? 0)) as 0 | 90 | 180 | 270,
      flipH: Boolean(s.properties.flipH ?? false),
      flipV: Boolean(s.properties.flipV ?? false),
    }));

  const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setClips((prev) => {
      const newClips = Array.from(files).map((file, i) => {
        const url = URL.createObjectURL(file);
        const type: "video" | "image" = file.type.startsWith("video/") ? "video" : "image";
        const clipIndex = prev.length + i;
        const tplEffect =
          templateEffects[clipIndex] ?? (templateEffects.length > 0 ? templateEffects[0] : undefined);
        return {
          url,
          type,
          name: file.name,
          id: `${Date.now()}-${i}`,
          duration: isVideo(type) ? 0 : 3,
          trimStart: 0,
          trimEnd: isVideo(type) ? 0 : 3,
          effects: tplEffect ?? undefined,
        };
      });
      return [...prev, ...newClips];
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSplit = () => {
    let accumulated = 0;
    let targetIndex = 0;
    let offset = 0;
    for (let i = 0; i < clips.length; i++) {
      const activeDuration = clips[i].trimEnd - clips[i].trimStart;
      accumulated += activeDuration;
      if (currentTime < accumulated) {
        targetIndex = i;
        offset = currentTime - (accumulated - activeDuration);
        break;
      }
      if (i === clips.length - 1) {
        targetIndex = i;
        offset = activeDuration;
      }
    }

    const clip = clips[targetIndex];
    if (!clip) return;
    const splitTime = clip.trimStart + offset;

    if (splitTime - clip.trimStart < 0.1 || clip.trimEnd - splitTime < 0.1) {
      return;
    }

    const clipA = { ...clip, trimEnd: splitTime, id: `${clip.id}-A` };
    const clipB = { ...clip, trimStart: splitTime, id: `${clip.id}-B` };

    setClips(prev => {
      const newClips = [...prev];
      newClips.splice(targetIndex, 1, clipA, clipB);
      return newClips;
    });
  };

  const handleAddText = () => {
    setTexts(prev => [...prev, {
      id: Date.now().toString(),
      text: "New Text",
      x: 0,
      y: 0,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, maxDuration)
    }]);
  };

  const updateText = (id: string, updated: OverlayText) => {
    setTexts(prev => prev.map(t => t.id === id ? updated : t));
  };

  const handleApplyCrop = (crop: CropData) => {
    setClips(prev => {
      const newClips = [...prev];
      const isFull = crop.x === 0 && crop.y === 0 && crop.w === 100 && crop.h === 100;
      newClips[currentClipIndex] = { ...newClips[currentClipIndex], crop: isFull ? undefined : crop };
      return newClips;
    });
    setIsCropping(false);
  };

  const handleToolbarAction = (action: string) => {
    console.log(`Action: ${action}`);
    if (action === "Speed") {
      setIsSpeedOpen(prev => !prev);
      setIsCropping(false);
      return;
    }
    if (action === "Ratio") {
      setIsCropping(true);
      setIsSpeedOpen(false);
      return;
    }
    if (action === "Split") {
      handleSplit();
      return;
    }
    if (action === "Text") {
      handleAddText();
      return;
    }
    if (action === "Add") {
      fileInputRef.current?.click();
      return;
    }
    if (action === "Audio") {
      audioInputRef.current?.click();
      return;
    }
    if (action === "Mute") {
      setIsMuted(prev => !prev);
      return;
    }
    if (!ffmpegLoaded) {
      showToast("FFmpeg is loading... Please wait.");
      return;
    }
    // In a real implementation, you would call ffmpeg.exec() here
    // Example: await ffmpeg.exec(['-i', 'input.mp4', '-t', '5', 'output.mp4']);
  };

  const isDraggingRef = useRef<{ index: number, type: 'start' | 'end', startX: number, startTrim: number } | null>(null);

  const startTrim = (e: React.PointerEvent, index: number, type: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = {
      index,
      type,
      startX: e.clientX,
      startTrim: type === 'start' ? clips[index].trimStart : clips[index].trimEnd,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const { index, type, startX, startTrim } = isDraggingRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / PIXELS_PER_SECOND;

      setClips(prev => {
        const newClips = [...prev];
        const clip = { ...newClips[index] };

        if (type === 'start') {
          let newTrimStart = startTrim + deltaSeconds;
          newTrimStart = Math.max(0, Math.min(newTrimStart, clip.trimEnd - 0.5)); // min 0.5s duration
          clip.trimStart = newTrimStart;
        } else {
          const maxAllowedDuration = isVideo(clip.type) ? clip.duration : 3600; // Images can stretch infinitely
          let newTrimEnd = startTrim + deltaSeconds;
          newTrimEnd = Math.min(maxAllowedDuration, Math.max(newTrimEnd, clip.trimStart + 0.5));
          clip.trimEnd = newTrimEnd;
        }

        newClips[index] = clip;
        return newClips;
      });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const isTextDraggingRef = useRef<{ id: string, type: 'start' | 'end', startX: number, originalTime: number } | null>(null);

  const startTextTrim = (e: React.PointerEvent, id: string, type: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    const textItem = texts.find(t => t.id === id);
    if (!textItem) return;

    isTextDraggingRef.current = {
      id,
      type,
      startX: e.clientX,
      originalTime: type === 'start' ? textItem.startTime : textItem.endTime,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isTextDraggingRef.current) return;
      const { id, type, startX, originalTime } = isTextDraggingRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / PIXELS_PER_SECOND;

      setTexts(prev => prev.map(t => {
        if (t.id !== id) return t;
        const newT = { ...t };

        if (type === 'start') {
          let newStartTime = originalTime + deltaSeconds;
          newStartTime = Math.max(0, Math.min(newStartTime, t.endTime - 0.5)); // min 0.5s duration
          newT.startTime = newStartTime;
        } else {
          let newEndTime = originalTime + deltaSeconds;
          newEndTime = Math.max(newEndTime, t.startTime + 0.5); // can stretch infinitely
          newT.endTime = newEndTime;
        }
        return newT;
      }));
    };

    const handlePointerUp = () => {
      isTextDraggingRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleAddAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioInputRef.current) audioInputRef.current.value = '';
    const url = URL.createObjectURL(file);
    const probe = document.createElement('audio');
    probe.src = url;
    probe.onloadedmetadata = () => {
      const duration = probe.duration;
      const startTime = currentTimeRef.current;
      setAudios(prev => [...prev, {
        id: `audio-${Date.now()}`,
        url,
        name: file.name,
        duration,
        startTime,
        endTime: startTime + duration,
      }]);
    };
    probe.onerror = () => URL.revokeObjectURL(url);
  };

  const isAudioTrimDraggingRef = useRef<{
    id: string; type: 'start' | 'end'; startX: number;
    origStart: number; origEnd: number;
  } | null>(null);

  const startAudioTrim = (e: React.PointerEvent, id: string, type: 'start' | 'end') => {
    e.stopPropagation(); e.preventDefault();
    const clip = audios.find(a => a.id === id);
    if (!clip) return;
    isAudioTrimDraggingRef.current = {
      id, type, startX: e.clientX,
      origStart: clip.startTime, origEnd: clip.endTime,
    };

    const onMove = (me: PointerEvent) => {
      if (!isAudioTrimDraggingRef.current) return;
      const { origStart, origEnd } = isAudioTrimDraggingRef.current;
      const delta = (me.clientX - isAudioTrimDraggingRef.current.startX) / PIXELS_PER_SECOND;
      setAudios(prev => prev.map(a => {
        if (a.id !== id) return a;
        if (type === 'start') {
          let ns = origStart + delta;
          ns = Math.max(0, ns);
          ns = Math.min(ns, a.endTime - 0.5);
          ns = Math.max(ns, a.endTime - a.duration); // can't stretch beyond real duration
          return { ...a, startTime: ns };
        } else {
          let ne = origEnd + delta;
          ne = Math.max(ne, a.startTime + 0.5);
          ne = Math.min(ne, a.startTime + a.duration); // can't stretch beyond real duration
          return { ...a, endTime: ne };
        }
      }));
    };
    const onUp = () => {
      isAudioTrimDraggingRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  const handleApplySpeed = (rate: number) => {
    if (!clips[currentClipIndex]) return;
    if (!isVideo(clips[currentClipIndex].type)) {
      showToast("Photos cannot have playback speed set. Adjust the length directly in the timeline.");
      return;
    }
    setClips(prev => {
      const newClips = [...prev];
      newClips[currentClipIndex] = { ...newClips[currentClipIndex], playbackRate: rate };
      return newClips;
    });
  };

  const handleExportAndDownload = async () => {
    if (!ffmpegLoaded) {
      showToast("FFmpeg is still loading. Please wait.");
      return;
    }

    const videoClips = clips.filter((c) => isVideo(c.type));
    if (videoClips.length === 0) {
      showToast("No video clips to export.", "error");
      return;
    }

    // Show overlay first, then yield so React renders before FFmpeg blocks
    setIsExporting(true);
    setExportProgress(2);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const ffmpeg = ffmpegRef.current;

    // Clip needs re-encode only if it has rotation / flip / speed change
    const needsReencode = (c: TimelineClip) =>
      (c.playbackRate ?? 1) !== 1 ||
      !!(c.effects?.rotate) ||
      !!(c.effects?.flipH) ||
      !!(c.effects?.flipV);

    try {
      for (let i = 0; i < videoClips.length; i++) {
        const c = videoClips[i];
        const outFile = `clip_${i}.mp4`;

        // Progress: writing phase (2% → 40% spread across clips)
        setExportProgress(2 + Math.round((i / videoClips.length) * 38));

        await ffmpeg.writeFile(`in_${i}.mp4`, await fetchFile(c.url));

        const trimDuration = c.trimEnd - c.trimStart;
        const rate = c.playbackRate ?? 1;
        const isTrimmed = c.trimStart > 0 || c.trimEnd < c.duration;

        if (!needsReencode(c)) {
          // Stream copy — no re-encode needed (trim only or no edits)
          // Input seeking before -i for accurate + fast trim
          const cmd: string[] = [];
          if (isTrimmed) {
            cmd.push("-ss", String(c.trimStart), "-t", String(trimDuration));
          }
          cmd.push("-i", `in_${i}.mp4`, "-c", "copy", "-avoid_negative_ts", "make_zero", outFile);
          await ffmpeg.exec(cmd);
        } else {
          // Re-encode only when necessary (rotation / flip / speed)
          const vfFilters: string[] = [];
          const afFilters: string[] = [];

          if (rate !== 1) {
            vfFilters.push(`setpts=${(1 / rate).toFixed(4)}*PTS`);
            afFilters.push(`atempo=${Math.min(Math.max(rate, 0.5), 2)}`);
          }
          if (c.effects?.rotate === 90) vfFilters.push("transpose=1");
          else if (c.effects?.rotate === 180) vfFilters.push("transpose=1,transpose=1");
          else if (c.effects?.rotate === 270) vfFilters.push("transpose=2");
          if (c.effects?.flipH) vfFilters.push("hflip");
          if (c.effects?.flipV) vfFilters.push("vflip");

          const cmd: string[] = [
            "-ss", String(c.trimStart),
            "-t", String(trimDuration),
            "-i", `in_${i}.mp4`,
            "-preset", "ultrafast",
            "-crf", "26",
          ];
          if (vfFilters.length > 0) cmd.push("-vf", vfFilters.join(","));
          if (afFilters.length > 0) cmd.push("-af", afFilters.join(","));
          else cmd.push("-c:a", "copy");
          cmd.push("-c:v", "libx264", outFile);

          // Track FFmpeg encode progress for this clip
          const clipBase = 40 + Math.round((i / videoClips.length) * 50);
          const clipTop  = 40 + Math.round(((i + 1) / videoClips.length) * 50);
          const onProgress = ({ progress }: { progress: number }) => {
            setExportProgress(clipBase + Math.round(progress * (clipTop - clipBase)));
          };
          ffmpeg.on("progress", onProgress);
          await ffmpeg.exec(cmd);
          ffmpeg.off("progress", onProgress);
        }

        // Progress: after this clip encoded
        setExportProgress(40 + Math.round(((i + 1) / videoClips.length) * 50));
      }

      setExportProgress(92);

      let finalFile: string;
      if (videoClips.length === 1) {
        finalFile = "clip_0.mp4";
      } else {
        const listContent = videoClips.map((_, i) => `file 'clip_${i}.mp4'`).join("\n");
        await ffmpeg.writeFile("concat.txt", listContent);
        await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
        finalFile = "output.mp4";
      }

      setExportProgress(97);

      const data = await ffmpeg.readFile(finalFile);
      const uint8 = data instanceof Uint8Array ? Uint8Array.from(data) : new Uint8Array();
      const blob = new Blob([uint8], { type: "video/mp4" });
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
      showToast("Failed to export video. Please try again.", "error");
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  let accumulated = 0;
  let currentClipIndex = 0;
  let offsetWithinClip = 0;
  for (let i = 0; i < clips.length; i++) {
    const rate = isVideo(clips[i].type) ? (clips[i].playbackRate || 1) : 1;
    const activeDuration = (clips[i].trimEnd - clips[i].trimStart) / rate;
    accumulated += activeDuration;
    if (currentTime < accumulated) {
      currentClipIndex = i;
      offsetWithinClip = (currentTime - (accumulated - activeDuration)) * rate;
      break;
    }
    if (i === clips.length - 1) {
      currentClipIndex = i;
      offsetWithinClip = activeDuration * rate;
    }
  }

  const preview = useMemo(() => clips[currentClipIndex], [clips, currentClipIndex]);

  useEffect(() => {
    if (videoRef.current && isVideo(preview.type)) {
      const offset = preview.trimStart + offsetWithinClip;

      const targetRate = preview.playbackRate || 1;
      if (videoRef.current.playbackRate !== targetRate) {
        videoRef.current.playbackRate = targetRate;
      }

      if (!isPlaying || Math.abs(videoRef.current.currentTime - offset) > 0.2) {
        videoRef.current.currentTime = offset;
      }
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [currentTime, preview, isPlaying]);

  // 비디오 mute 동기화
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // 오디오 클립 재생 동기화
  useEffect(() => {
    audios.forEach(clip => {
      const el = audioRefs.current.get(clip.id);
      if (!el) return;
      el.muted = isMuted;
      const inRange = isPlaying && currentTime >= clip.startTime && currentTime < clip.endTime;
      const targetAudioTime = Math.max(0, currentTime - clip.startTime);
      if (inRange) {
        if (Math.abs(el.currentTime - targetAudioTime) > 0.3) el.currentTime = targetAudioTime;
        if (el.paused) el.play().catch(() => { });
      } else {
        if (!el.paused) el.pause();
        if (!isPlaying) el.currentTime = Math.min(targetAudioTime, clip.duration);
      }
    });
  }, [currentTime, isPlaying, audios, isMuted]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white text-[#333]">
        <div className="relative flex h-24 w-24 items-center justify-center mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-[#E5E8EB]" />
          <div className="absolute inset-0 rounded-full border-4 border-[#FFCA1D] border-t-transparent animate-spin" />
          <Scissors className="h-8 w-8 text-[#FFCA1D] animate-pulse" />
        </div>
        <h2 className="font-paperlogy text-2xl font-bold tracking-wider mb-3">
          Setting up Studio
        </h2>
        <p className="text-sm text-[#888] animate-pulse">
          Analyzing media files and preparing the timeline...
        </p>
      </div>
    );
  }

  if (!clips.length) {
    return null;
  }

  const toolbar = [
    { icon: Scissors, label: "Split" },
    { icon: Type, label: "Text" },
    { icon: Crop, label: "Ratio" },
    { icon: Music, label: "Audio" },
    { icon: VolumeX, label: "Mute" },
    { icon: Sparkles, label: "Effects" },
    { icon: CircleGauge, label: "Speed" },
    { icon: ImagePlus, label: "Add" },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-white">
      <ExportProgressModal
        isExporting={isExporting}
        progress={exportProgress}
        isDone={exportDone}
        onClose={() => {
          setExportDone(false);
          setIsExporting(false);
          setExportProgress(0);
        }}
      />
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-5">
        <Link
          to="/create/editor"
          className="flex h-10 w-10 items-center justify-center text-[#BDBDBD] transition-colors hover:text-[#333]"
          aria-label="Back"
        >
          <span className="font-light text-3xl leading-none">×</span>
        </Link>
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExportAndDownload}
          className="font-paperlogy text-base font-bold tracking-wide text-[#FFCA1D] disabled:opacity-50 sm:text-lg"
        >
          upload
        </button>
      </header>

      {/* Preview + transport */}
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-8 sm:py-6">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black/5">
            {preview && isVideo(preview.type) ? (
              <video
                ref={videoRef}
                src={preview.url}
                className="h-full w-full object-contain drop-shadow-sm transition-all"
                style={preview.crop ? { clipPath: `polygon(${preview.crop.x}% ${preview.crop.y}%, ${preview.crop.x + preview.crop.w}% ${preview.crop.y}%, ${preview.crop.x + preview.crop.w}% ${preview.crop.y + preview.crop.h}%, ${preview.crop.x}% ${preview.crop.y + preview.crop.h}%)` } : {}}
                controls={false}
                playsInline
                crossOrigin="anonymous"
                onEnded={() => setIsPlaying(false)}
              />
            ) : preview ? (
              <img
                src={preview.url}
                alt={preview.name}
                className="h-full w-full object-contain drop-shadow-sm transition-all"
                style={preview.crop ? { clipPath: `polygon(${preview.crop.x}% ${preview.crop.y}%, ${preview.crop.x + preview.crop.w}% ${preview.crop.y}%, ${preview.crop.x + preview.crop.w}% ${preview.crop.y + preview.crop.h}%, ${preview.crop.x}% ${preview.crop.y + preview.crop.h}%)` } : {}}
                draggable={false}
                crossOrigin="anonymous"
              />
            ) : null}

            {isCropping && preview && (
              <CropOverlay
                initialCrop={preview.crop}
                onSave={handleApplyCrop}
                onCancel={() => setIsCropping(false)}
              />
            )}

            {/* Draggable Text Overlays */}
            {texts.filter(t => currentTime >= t.startTime && currentTime <= t.endTime).map(t => (
              <DraggableText key={t.id} textItem={t} onUpdate={(updated) => updateText(t.id, updated)} />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-8">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-start text-[#666] transition-colors hover:text-black"
            aria-label="Full screen"
          >
            <Maximize2 className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center text-[#666] transition-colors hover:text-black"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" strokeWidth={1} />
            ) : (
              <Play className="h-6 w-6" strokeWidth={1} />
            )}
          </button>

          <div className="flex items-center gap-4 text-[#666]">
            <button
              type="button"
              className="transition-colors hover:text-black"
              aria-label="Undo"
            >
              <Undo2 className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="transition-colors hover:text-black"
              aria-label="Redo"
            >
              <Redo2 className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline panel */}
      <div className="relative flex shrink-0 flex-1 min-h-0 border-t border-[#E5E8EB] bg-[#F4F5F7]">
        {/* Hidden file input for Add button */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="video/*,image/*"
          multiple
          onChange={handleAddMedia}
        />

        {/* Fixed Center Playhead Line */}
        <div className="absolute bottom-0 top-0 left-1/2 z-20 w-[1.5px] bg-black" aria-hidden />

        {/* Full width timeline */}
        <div
          ref={timelineRef}
          onScroll={handleScroll}
          className="w-full flex flex-col overflow-x-auto overflow-y-hidden scroll-smooth"
          style={{ scrollBehavior: isPlaying ? "auto" : "smooth" }}
        >
          {/* Ruler */}
          <div className="border-b border-[#DDE2E8] px-0 py-3">
            <div className="flex min-w-max font-mono text-xs text-[#8A9399]">
              {/* Spacer to push 00:00 to the center */}
              <div className="w-[50vw] shrink-0" />
              {Array.from({ length: maxDuration + 1 }).map((_, i) => (
                <span key={i} className="w-32 shrink-0">
                  {formatTime(i)}
                </span>
              ))}
              {/* padding to allow scrolling past the end */}
              <div className="w-[50vw] shrink-0" />
            </div>
          </div>

          <div className="px-0 py-0 min-w-max pb-10">
            {/* Video Track */}
            <div className="flex gap-0 overflow-x-visible h-32 bg-[#F4F5F7]">
              {/* Spacer before clips */}
              <div className="w-[50vw] shrink-0 border-r border-[#DDE2E8]" />
              <div className="flex shrink-0 bg-[#222]">
                {clips.map((c, i) => {
                  const rate = isVideo(c.type) ? (c.playbackRate || 1) : 1;
                  const activeDuration = (c.trimEnd - c.trimStart) / rate;
                  const clipWidth = Math.max(10, activeDuration * PIXELS_PER_SECOND);
                  const numThumbnails = Math.min(40, Math.max(1, Math.ceil(clipWidth / 128)));

                  return (
                    <div key={c.id} className="relative shrink-0 group flex">
                      <button
                        type="button"
                        onClick={() => { setSelectedClipIndex(i); setSelectedTextId(null); }}
                        style={{ width: clipWidth }}
                        className={`h-32 shrink-0 overflow-hidden relative cursor-pointer outline-none bg-[#333] ${selectedClipIndex === i ? "ring-[3px] ring-inset ring-white z-10" : "border-r border-black/20"
                          }`}
                      >
                        <div className="flex h-full w-full">
                          {Array.from({ length: numThumbnails }).map((_, idx) => {
                            if (isVideo(c.type)) {
                              const thumbWidth = 128;
                              const offsetIdx = Math.floor((c.trimStart * PIXELS_PER_SECOND) / thumbWidth) + idx;
                              const thumbUrl = thumbnails[c.url]?.[offsetIdx];
                              if (thumbUrl) {
                                return (
                                  <img
                                    key={idx}
                                    src={thumbUrl}
                                    alt=""
                                    className="h-full w-32 shrink-0 object-cover pointer-events-none opacity-80 transition-opacity duration-300"
                                  />
                                );
                              } else {
                                return (
                                  <div key={idx} className="h-full w-32 shrink-0 bg-[#222] border-r border-[#333] animate-pulse" />
                                );
                              }
                            } else {
                              return (
                                <img
                                  key={idx}
                                  src={c.url}
                                  alt=""
                                  className="h-full w-32 shrink-0 object-cover pointer-events-none"
                                  crossOrigin="anonymous"
                                />
                              );
                            }
                          })}
                        </div>
                      </button>

                      {selectedClipIndex === i && (
                        <>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-4 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-l-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]"
                            onPointerDown={(e) => startTrim(e, i, 'start')}
                          >
                            <div className="w-[2px] h-4 bg-black/40 rounded-full" />
                          </div>
                          <div
                            className="absolute right-0 top-0 bottom-0 w-4 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-r-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]"
                            onPointerDown={(e) => startTrim(e, i, 'end')}
                          >
                            <div className="w-[2px] h-4 bg-black/40 rounded-full" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* padding to allow scrolling past the end */}
              <div className="w-[50vw] shrink-0" />
            </div>

            {/* Text Track */}
            <div className="mt-2 w-full h-16 flex items-center border-y border-[#DDE2E8]">
              <div className="w-[50vw] shrink-0 border-r border-[#DDE2E8]" />
              <div className="relative shrink-0 h-full bg-[#E6E8EA]" style={{ width: maxDuration * PIXELS_PER_SECOND }}>
                <button
                  type="button"
                  onClick={handleAddText}
                  className="absolute inset-0 flex items-center px-4 font-paperlogy text-sm font-medium text-[#6B7680] hover:bg-[#D5D8DC] transition-colors outline-none w-full text-left"
                >
                  + Add Text
                </button>

                {texts.map(t => (
                  <div
                    key={t.id}
                    onPointerDown={(e) => { e.stopPropagation(); setSelectedClipIndex(null); setSelectedTextId(t.id); }}
                    className={`absolute top-2 bottom-2 rounded bg-[#FFCA1D] text-[#333] px-2 py-1 text-xs font-bold overflow-hidden shadow-sm z-10 select-none flex items-center ${selectedTextId === t.id ? "ring-[3px] ring-white" : "border border-[#D4A30A]"
                      }`}
                    style={{
                      left: t.startTime * PIXELS_PER_SECOND,
                      width: (t.endTime - t.startTime) * PIXELS_PER_SECOND
                    }}
                  >
                    <span className="truncate">{t.text}</span>

                    {selectedTextId === t.id && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-l-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]"
                          onPointerDown={(e) => startTextTrim(e, t.id, 'start')}
                        >
                          <div className="w-[2px] h-3 bg-black/40 rounded-full" />
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-r-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]"
                          onPointerDown={(e) => startTextTrim(e, t.id, 'end')}
                        >
                          <div className="w-[2px] h-3 bg-black/40 rounded-full" />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="w-[50vw] shrink-0" />
            </div>

            {/* Audio Track */}
            <div className="w-full h-16 flex items-center border-b border-[#DDE2E8]">
              <div className="w-[50vw] shrink-0 border-r border-[#DDE2E8]" />
              <div className="relative flex-1 h-full" style={{ minWidth: maxDuration * PIXELS_PER_SECOND }}>
                {audios.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="absolute inset-0 flex items-center px-4 bg-[#E6E8EA] hover:bg-[#D5D8DC] transition-colors font-paperlogy text-sm font-medium text-[#6B7680]"
                  >
                    + Add Audio
                  </button>
                ) : (
                  <div className="absolute inset-0 bg-[#F0F2F4]">
                    {audios.map(clip => {
                      const left = clip.startTime * PIXELS_PER_SECOND;
                      const width = (clip.endTime - clip.startTime) * PIXELS_PER_SECOND;
                      const isSelected = selectedAudioId === clip.id;
                      return (
                        <div
                          key={clip.id}
                          className={`absolute top-1 bottom-1 rounded-md flex items-center overflow-hidden cursor-pointer ${isSelected ? 'ring-2 ring-[#FFCA1D]' : ''}`}
                          style={{ left, width, background: '#A8D8A8', minWidth: 16 }}
                          onClick={() => setSelectedAudioId(id => id === clip.id ? null : clip.id)}
                        >
                          {/* left drag handle */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize bg-black/20 flex items-center justify-center z-10"
                            onPointerDown={e => startAudioTrim(e, clip.id, 'start')}
                          >
                            <div className="w-[2px] h-3 bg-white/80 rounded-full" />
                          </div>
                          <span className="mx-3 font-paperlogy text-xs text-[#2a6b2a] truncate select-none">
                            {clip.name}
                          </span>
                          {/* right drag handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize bg-black/20 flex items-center justify-center z-10"
                            onPointerDown={e => startAudioTrim(e, clip.id, 'end')}
                          >
                            <div className="w-[2px] h-3 bg-white/80 rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="w-[50vw] shrink-0" />
            </div>

            {/* Hidden audio elements */}
            {audios.map(clip => (
              <audio
                key={clip.id}
                ref={el => {
                  if (el) audioRefs.current.set(clip.id, el);
                  else audioRefs.current.delete(clip.id);
                }}
                src={clip.url}
                muted={isMuted}
                preload="auto"
                style={{ display: 'none' }}
              />
            ))}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAddAudio}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom tool dock */}
      <div className="border-t border-[#DDE2E8] bg-white px-2 py-3 sm:px-4 sm:py-4 relative">
        {isSpeedOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-[#E5E8EB] p-3 flex gap-2 items-center z-50">
            <span className="text-xs font-bold text-[#888] mr-1">Speed</span>
            {[0.5, 1, 1.25, 1.5, 2].map(rate => (
              <button
                key={rate}
                onClick={() => handleApplySpeed(rate)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${(clips[currentClipIndex]?.playbackRate || 1) === rate
                  ? "bg-[#FFCA1D] text-[#333]"
                  : "bg-[#F4F5F7] text-[#666] hover:bg-[#E5E8EB]"
                  }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}

        <div className="mx-auto flex w-full justify-between gap-1 sm:gap-2">
          {toolbar.map(({ icon: Icon, label }) => {
            const isActive = label === "Mute" && isMuted;
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleToolbarAction(label)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1 transition-colors hover:bg-[#F5F5F5] ${isActive ? 'text-[#FFCA1D]' : 'text-[#333]'}`}
              >
                <Icon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" strokeWidth={1} />
                <span className="truncate font-paperlogy text-xs font-medium sm:text-sm">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
