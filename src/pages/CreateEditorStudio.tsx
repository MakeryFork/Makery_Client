import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Crop, ImagePlus, Maximize2, Music, Redo2, Scissors, Sparkles, Type, Undo2, VolumeX, CircleGauge, Play, Pause } from "lucide-react";
import type { EditorStudioLocationState } from "./CreateEditorMediaPicker";
import type { PurchaseSource } from "@/lib/types";
import ExportProgressModal from "@/components/ExportProgressModal";
import { ToastNotification } from "@/components/editor/ToastNotification";
import { CropOverlay } from "@/components/editor/CropOverlay";
import { DraggableText } from "@/components/editor/DraggableText";
import { VideoTrack } from "@/components/editor/VideoTrack";
import { TextTrack } from "@/components/editor/TextTrack";
import { AudioTrack } from "@/components/editor/AudioTrack";
import type { AudioClip, CropData, FilterPreset, TimelineClip, ToastType, OverlayText } from "@/components/editor/types";
import { PIXELS_PER_SECOND } from "@/components/editor/types";
import { isVideo, formatTime } from "@/components/editor/utils";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { usePlayback } from "@/hooks/usePlayback";
import { useThumbnails } from "@/hooks/useThumbnails";
import { useEditorKeyboard } from "@/hooks/useEditorKeyboard";
import { useExport } from "@/hooks/useExport";

export default function CreateEditorStudio() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as EditorStudioLocationState | undefined;
  const initialClips = state?.clips ?? [];
  const templateSources: PurchaseSource[] = state?.templateSources ?? [];

  // ─── state ──────────────────────────────────────────────────────────────────
  const [clips, setClips] = useState<TimelineClip[]>(() =>
    initialClips.map((c, i) => ({
      ...c, id: `${i}-${Date.now()}`,
      duration: isVideo(c.type) ? 0 : 3,
      trimStart: 0, trimEnd: isVideo(c.type) ? 0 : 3,
    }))
  );
  const [texts, setTexts] = useState<OverlayText[]>(() =>
    templateSources.filter((s) => s.type === "animation" && s.properties?.text).map((s) => ({
      id: `tpl-${s.startTime}`, text: String(s.properties.text ?? ""),
      x: Number(s.properties.x ?? 0), y: Number(s.properties.y ?? 0),
      startTime: s.startTime, endTime: s.endTime,
    }))
  );
  const [audios, setAudios] = useState<AudioClip[]>(() =>
    templateSources.filter((s) => s.type === "audio" && s.properties?.url).map((s) => ({
      id: `tpl-audio-${s.startTime}`, url: String(s.properties.url),
      name: String(s.properties.name ?? "Audio"), duration: s.endTime - s.startTime,
      startTime: s.startTime, endTime: s.endTime,
    }))
  );
  const [isMuted, setIsMuted] = useState(false);
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => setToast({ message, type });

  // ─── refs ────────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // ─── derived ─────────────────────────────────────────────────────────────────
  const videoMaxDuration = Math.ceil(clips.reduce((acc, c) => {
    const rate = isVideo(c.type) ? (c.playbackRate || 1) : 1;
    return acc + (c.trimEnd - c.trimStart) / rate;
  }, 0));
  const maxDuration = Math.max(
    videoMaxDuration,
    texts.length > 0 ? Math.ceil(Math.max(...texts.map((t) => t.endTime))) : 0,
    audios.length > 0 ? Math.ceil(Math.max(...audios.map((a) => a.endTime))) : 0
  );

  // ─── hooks ───────────────────────────────────────────────────────────────────
  const { ffmpegRef, ffmpegLoaded, loadFFmpeg } = useFFmpeg(showToast);
  const { isPlaying, setIsPlaying, currentTime, currentTimeRef, togglePlay, handleScroll } = usePlayback(maxDuration, timelineRef);
  const { thumbnails } = useThumbnails(clips, PIXELS_PER_SECOND);
  const { isExporting, exportProgress, exportDone, handleExportAndDownload, resetExport } = useExport({ ffmpegRef, ffmpegLoaded, clips, onToast: showToast });

  useEditorKeyboard({
    selectedClipIndex, selectedTextId, selectedAudioId,
    onDeleteClip: (i) => { setClips((prev) => prev.filter((_, idx) => idx !== i)); setSelectedClipIndex(null); },
    onDeleteText: (id) => { setTexts((prev) => prev.filter((t) => t.id !== id)); setSelectedTextId(null); },
    onDeleteAudio: (id) => {
      const el = audioRefs.current.get(id);
      if (el) { el.pause(); el.src = ""; audioRefs.current.delete(id); }
      setAudios((prev) => prev.filter((a) => a.id !== id));
      setSelectedAudioId(null);
    },
  });

  // ─── effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadFFmpeg(); if (!clips.length) navigate("/create/editor", { replace: true }); }, []);

  useEffect(() => {
    const hasUnloaded = clips.some((c) => isVideo(c.type) && c.duration === 0);
    if (!hasUnloaded) return;
    Promise.all(clips.map((c) => {
      if (!isVideo(c.type) || c.duration !== 0) return c;
      return new Promise<TimelineClip>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        const fallback = setTimeout(() => resolve({ ...c, duration: 5, trimEnd: 5 }), 8000);
        v.onloadedmetadata = () => { clearTimeout(fallback); resolve({ ...c, duration: v.duration, trimEnd: v.duration }); };
        v.onerror = () => { clearTimeout(fallback); resolve({ ...c, duration: 5, trimEnd: 5 }); };
        v.src = c.url;
      });
    })).then(setClips);
  }, [clips]);

  useEffect(() => {
    if (clips.length > 0 && !clips.some((c) => isVideo(c.type) && c.duration === 0)) {
      const t = setTimeout(() => setIsInitializing(false), 1200);
      return () => clearTimeout(t);
    }
  }, [clips]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    return () => { audioRefs.current.forEach((el) => { el.pause(); el.src = ""; }); };
  }, []);

  // current clip at playhead
  let accumulated = 0, currentClipIndex = 0, offsetWithinClip = 0;
  for (let i = 0; i < clips.length; i++) {
    const rate = isVideo(clips[i].type) ? (clips[i].playbackRate || 1) : 1;
    const dur = (clips[i].trimEnd - clips[i].trimStart) / rate;
    accumulated += dur;
    if (currentTime < accumulated) { currentClipIndex = i; offsetWithinClip = (currentTime - (accumulated - dur)) * rate; break; }
    if (i === clips.length - 1) { currentClipIndex = i; offsetWithinClip = dur * rate; }
  }
  const preview = useMemo(() => clips[currentClipIndex], [clips, currentClipIndex]);

  // video element sync
  useEffect(() => {
    if (!videoRef.current || !isVideo(preview?.type)) return;
    const offset = preview.trimStart + offsetWithinClip;
    if (videoRef.current.playbackRate !== (preview.playbackRate || 1)) videoRef.current.playbackRate = preview.playbackRate || 1;
    if (!isPlaying || Math.abs(videoRef.current.currentTime - offset) > 0.2) videoRef.current.currentTime = offset;
    if (isPlaying && videoRef.current.paused) videoRef.current.play().catch(console.error);
    else if (!isPlaying && !videoRef.current.paused) videoRef.current.pause();
  }, [currentTime, preview, isPlaying]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = isMuted; }, [isMuted]);

  useEffect(() => {
    audios.forEach((clip) => {
      const el = audioRefs.current.get(clip.id);
      if (!el) return;
      el.muted = isMuted;
      const inRange = isPlaying && currentTime >= clip.startTime && currentTime < clip.endTime;
      const targetTime = Math.max(0, currentTime - clip.startTime);
      if (inRange) {
        if (Math.abs(el.currentTime - targetTime) > 0.3) el.currentTime = targetTime;
        if (el.paused) el.play().catch(() => { });
      } else {
        if (!el.paused) el.pause();
        if (!isPlaying) el.currentTime = Math.min(targetTime, clip.duration);
      }
    });
  }, [currentTime, isPlaying, audios, isMuted]);

  // ─── handlers ────────────────────────────────────────────────────────────────
  const templateEffects = templateSources.filter((s) => s.type === "effect").map((s) => ({
    filter: (s.properties.filter as FilterPreset) ?? "none",
    rotate: (Number(s.properties.rotate ?? 0)) as 0 | 90 | 180 | 270,
    flipH: Boolean(s.properties.flipH ?? false),
    flipV: Boolean(s.properties.flipV ?? false),
  }));

  const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setClips((prev) => [
      ...prev,
      ...Array.from(files).map((file, i) => {
        const url = URL.createObjectURL(file);
        const type: "video" | "image" = file.type.startsWith("video/") ? "video" : "image";
        const tplEffect = templateEffects[prev.length + i] ?? templateEffects[0];
        return { url, type, name: file.name, id: `${Date.now()}-${i}`, duration: isVideo(type) ? 0 : 3, trimStart: 0, trimEnd: isVideo(type) ? 0 : 3, effects: tplEffect };
      }),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSplit = () => {
    let acc = 0;
    for (let i = 0; i < clips.length; i++) {
      const dur = clips[i].trimEnd - clips[i].trimStart;
      acc += dur;
      if (currentTime < acc || i === clips.length - 1) {
        const offset = currentTime - (acc - dur);
        const splitTime = clips[i].trimStart + offset;
        if (splitTime - clips[i].trimStart < 0.1 || clips[i].trimEnd - splitTime < 0.1) return;
        setClips((prev) => { const next = [...prev]; next.splice(i, 1, { ...clips[i], trimEnd: splitTime, id: `${clips[i].id}-A` }, { ...clips[i], trimStart: splitTime, id: `${clips[i].id}-B` }); return next; });
        break;
      }
    }
  };

  const handleAddText = () => {
    setTexts((prev) => [...prev, { id: Date.now().toString(), text: "New Text", x: 0, y: 0, startTime: currentTimeRef.current, endTime: Math.min(currentTimeRef.current + 3, maxDuration) }]);
  };

  const handleApplyCrop = (crop: CropData) => {
    setClips((prev) => { const next = [...prev]; const isFull = crop.x === 0 && crop.y === 0 && crop.w === 100 && crop.h === 100; next[currentClipIndex] = { ...next[currentClipIndex], crop: isFull ? undefined : crop }; return next; });
    setIsCropping(false);
  };

  const handleApplySpeed = (rate: number) => {
    if (!clips[currentClipIndex] || !isVideo(clips[currentClipIndex].type)) { showToast("Photos cannot have playback speed set."); return; }
    setClips((prev) => { const next = [...prev]; next[currentClipIndex] = { ...next[currentClipIndex], playbackRate: rate }; return next; });
  };

  const handleAddAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioInputRef.current) audioInputRef.current.value = "";
    const url = URL.createObjectURL(file);
    const probe = document.createElement("audio");
    probe.src = url;
    probe.onloadedmetadata = () => {
      const startTime = currentTimeRef.current;
      setAudios((prev) => [...prev, { id: `audio-${Date.now()}`, url, name: file.name, duration: probe.duration, startTime, endTime: startTime + probe.duration }]);
    };
    probe.onerror = () => URL.revokeObjectURL(url);
  };

  const startTrim = (e: React.PointerEvent, index: number, type: "start" | "end") => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX;
    const startTrimVal = type === "start" ? clips[index].trimStart : clips[index].trimEnd;
    const onMove = (me: PointerEvent) => {
      const delta = (me.clientX - startX) / PIXELS_PER_SECOND;
      setClips((prev) => {
        const next = [...prev];
        const c = { ...next[index] };
        if (type === "start") c.trimStart = Math.max(0, Math.min(startTrimVal + delta, c.trimEnd - 0.5));
        else c.trimEnd = Math.min(isVideo(c.type) ? c.duration : 3600, Math.max(startTrimVal + delta, c.trimStart + 0.5));
        next[index] = c; return next;
      });
    };
    const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const startTextTrim = (e: React.PointerEvent, id: string, type: "start" | "end") => {
    e.stopPropagation(); e.preventDefault();
    const textItem = texts.find((t) => t.id === id);
    if (!textItem) return;
    const startX = e.clientX;
    const origTime = type === "start" ? textItem.startTime : textItem.endTime;
    const onMove = (me: PointerEvent) => {
      const delta = (me.clientX - startX) / PIXELS_PER_SECOND;
      setTexts((prev) => prev.map((t) => {
        if (t.id !== id) return t;
        if (type === "start") return { ...t, startTime: Math.max(0, Math.min(origTime + delta, t.endTime - 0.5)) };
        return { ...t, endTime: Math.max(origTime + delta, t.startTime + 0.5) };
      }));
    };
    const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const startAudioTrim = (e: React.PointerEvent, id: string, type: "start" | "end") => {
    e.stopPropagation(); e.preventDefault();
    const clip = audios.find((a) => a.id === id);
    if (!clip) return;
    const startX = e.clientX;
    const { startTime: origStart, endTime: origEnd } = clip;
    const onMove = (me: PointerEvent) => {
      const delta = (me.clientX - startX) / PIXELS_PER_SECOND;
      setAudios((prev) => prev.map((a) => {
        if (a.id !== id) return a;
        if (type === "start") return { ...a, startTime: Math.max(Math.max(0, origStart + delta), a.endTime - a.duration) };
        return { ...a, endTime: Math.min(Math.max(origEnd + delta, a.startTime + 0.5), a.startTime + a.duration) };
      }));
    };
    const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleToolbarAction = (action: string) => {
    if (action === "Speed") { setIsSpeedOpen((p) => !p); setIsCropping(false); return; }
    if (action === "Ratio") { setIsCropping(true); setIsSpeedOpen(false); return; }
    if (action === "Split") { handleSplit(); return; }
    if (action === "Text") { handleAddText(); return; }
    if (action === "Add") { fileInputRef.current?.click(); return; }
    if (action === "Audio") { audioInputRef.current?.click(); return; }
    if (action === "Mute") { setIsMuted((p) => !p); return; }
    if (!ffmpegLoaded) { showToast("FFmpeg is loading... Please wait."); return; }
  };

  // ─── loading screen ──────────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white text-[#333]">
        <div className="relative flex h-24 w-24 items-center justify-center mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-[#E5E8EB]" />
          <div className="absolute inset-0 rounded-full border-4 border-[#FFCA1D] border-t-transparent animate-spin" />
          <Scissors className="h-8 w-8 text-[#FFCA1D] animate-pulse" />
        </div>
        <h2 className="font-paperlogy text-2xl font-bold tracking-wider mb-3">Setting up Studio</h2>
        <p className="text-sm text-[#888] animate-pulse">Analyzing media files and preparing the timeline...</p>
      </div>
    );
  }
  if (!clips.length) return null;

  const toolbar = [
    { icon: Scissors, label: "Split" }, { icon: Type, label: "Text" },
    { icon: Crop, label: "Ratio" }, { icon: Music, label: "Audio" },
    { icon: VolumeX, label: "Mute" }, { icon: Sparkles, label: "Effects" },
    { icon: CircleGauge, label: "Speed" }, { icon: ImagePlus, label: "Add" },
  ] as const;

  const cropStyle = (clip: TimelineClip) =>
    clip.crop ? { clipPath: `polygon(${clip.crop.x}% ${clip.crop.y}%, ${clip.crop.x + clip.crop.w}% ${clip.crop.y}%, ${clip.crop.x + clip.crop.w}% ${clip.crop.y + clip.crop.h}%, ${clip.crop.x}% ${clip.crop.y + clip.crop.h}%)` } : {};

  return (
    <div className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-white">
      <ExportProgressModal isExporting={isExporting} progress={exportProgress} isDone={exportDone} onClose={resetExport} />
      {toast && <ToastNotification message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-5">
        <Link to="/create/editor" className="flex h-10 w-10 items-center justify-center text-[#BDBDBD] transition-colors hover:text-[#333]" aria-label="Back">
          <span className="font-light text-3xl leading-none">×</span>
        </Link>
        <button type="button" disabled={isExporting} onClick={handleExportAndDownload} className="font-paperlogy text-base font-bold tracking-wide text-[#FFCA1D] disabled:opacity-50 sm:text-lg">
          upload
        </button>
      </header>

      {/* Preview */}
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-8 sm:py-6">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black/5">
            {preview && isVideo(preview.type) ? (
              <video ref={videoRef} src={preview.url} className="h-full w-full object-contain drop-shadow-sm transition-all" style={cropStyle(preview)} controls={false} playsInline crossOrigin="anonymous" onEnded={() => setIsPlaying(false)} />
            ) : preview ? (
              <img src={preview.url} alt={preview.name} className="h-full w-full object-contain drop-shadow-sm transition-all" style={cropStyle(preview)} draggable={false} crossOrigin="anonymous" />
            ) : null}
            {isCropping && preview && <CropOverlay initialCrop={preview.crop} onSave={handleApplyCrop} onCancel={() => setIsCropping(false)} />}
            {texts.filter((t) => currentTime >= t.startTime && currentTime <= t.endTime).map((t) => (
              <DraggableText key={t.id} textItem={t} onUpdate={(updated) => setTexts((prev) => prev.map((x) => x.id === t.id ? updated : x))} />
            ))}
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-8">
          <button type="button" className="flex h-10 w-10 items-center justify-start text-[#666] transition-colors hover:text-black" aria-label="Full screen">
            <Maximize2 className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={togglePlay} className="flex h-10 w-10 items-center justify-center text-[#666] transition-colors hover:text-black" aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause className="h-6 w-6" strokeWidth={1} /> : <Play className="h-6 w-6" strokeWidth={1} />}
          </button>
          <div className="flex items-center gap-4 text-[#666]">
            <button type="button" className="transition-colors hover:text-black" aria-label="Undo"><Undo2 className="h-5 w-5" strokeWidth={1.5} /></button>
            <button type="button" className="transition-colors hover:text-black" aria-label="Redo"><Redo2 className="h-5 w-5" strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative flex shrink-0 flex-1 min-h-0 border-t border-[#E5E8EB] bg-[#F4F5F7]">
        <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="video/*,image/*" multiple onChange={handleAddMedia} />
        <div className="absolute bottom-0 top-0 left-1/2 z-20 w-[1.5px] bg-black" aria-hidden />
        <div ref={timelineRef} onScroll={handleScroll} className="w-full flex flex-col overflow-x-auto overflow-y-hidden scroll-smooth" style={{ scrollBehavior: isPlaying ? "auto" : "smooth" }}>
          {/* Ruler */}
          <div className="border-b border-[#DDE2E8] px-0 py-3">
            <div className="flex min-w-max font-mono text-xs text-[#8A9399]">
              <div className="w-[50vw] shrink-0" />
              {Array.from({ length: maxDuration + 1 }).map((_, i) => (
                <span key={i} className="w-32 shrink-0">{formatTime(i)}</span>
              ))}
              <div className="w-[50vw] shrink-0" />
            </div>
          </div>

          <div className="px-0 py-0 min-w-max pb-10">
            <VideoTrack clips={clips} selectedClipIndex={selectedClipIndex} thumbnails={thumbnails} pixelsPerSecond={PIXELS_PER_SECOND} onSelectClip={(i) => { setSelectedClipIndex(i); setSelectedTextId(null); }} onStartTrim={startTrim} />
            <TextTrack texts={texts} selectedTextId={selectedTextId} maxDuration={maxDuration} pixelsPerSecond={PIXELS_PER_SECOND} onSelectText={(id) => { setSelectedClipIndex(null); setSelectedTextId(id); }} onAddText={handleAddText} onStartTextTrim={startTextTrim} />
            <AudioTrack audios={audios} selectedAudioId={selectedAudioId} maxDuration={maxDuration} pixelsPerSecond={PIXELS_PER_SECOND} isMuted={isMuted} audioInputRef={audioInputRef} audioRefs={audioRefs} onSelectAudio={setSelectedAudioId} onStartAudioTrim={startAudioTrim} onAddAudio={handleAddAudio} />
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="border-t border-[#DDE2E8] bg-white px-2 py-3 sm:px-4 sm:py-4 relative">
        {isSpeedOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-[#E5E8EB] p-3 flex gap-2 items-center z-50">
            <span className="text-xs font-bold text-[#888] mr-1">Speed</span>
            {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
              <button key={rate} onClick={() => handleApplySpeed(rate)} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${(clips[currentClipIndex]?.playbackRate || 1) === rate ? "bg-[#FFCA1D] text-[#333]" : "bg-[#F4F5F7] text-[#666] hover:bg-[#E5E8EB]"}`}>
                {rate}x
              </button>
            ))}
          </div>
        )}
        <div className="mx-auto flex w-full justify-between gap-1 sm:gap-2">
          {toolbar.map(({ icon: Icon, label }) => (
            <button key={label} type="button" onClick={() => handleToolbarAction(label)} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1 transition-colors hover:bg-[#F5F5F5] ${label === "Mute" && isMuted ? "text-[#FFCA1D]" : "text-[#333]"}`}>
              <Icon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" strokeWidth={1} />
              <span className="truncate font-paperlogy text-xs font-medium sm:text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
