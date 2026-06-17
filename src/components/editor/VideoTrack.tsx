import type { TimelineClip } from "./types";
import { isVideo } from "./utils";

interface Props {
  clips: TimelineClip[];
  selectedClipIndex: number | null;
  thumbnails: Record<string, string[]>;
  pixelsPerSecond: number;
  onSelectClip: (index: number) => void;
  onStartTrim: (e: React.PointerEvent, index: number, type: "start" | "end") => void;
}

export function VideoTrack({ clips, selectedClipIndex, thumbnails, pixelsPerSecond, onSelectClip, onStartTrim }: Props) {
  return (
    <div className="flex gap-0 overflow-x-visible h-32 bg-[#F4F5F7]">
      <div className="w-[50vw] shrink-0 border-r border-[#DDE2E8]" />
      <div className="flex shrink-0 bg-[#222]">
        {clips.map((c, i) => {
          const rate = isVideo(c.type) ? (c.playbackRate || 1) : 1;
          const activeDuration = (c.trimEnd - c.trimStart) / rate;
          const clipWidth = Math.max(10, activeDuration * pixelsPerSecond);
          const numThumbnails = Math.min(40, Math.max(1, Math.ceil(clipWidth / 128)));

          return (
            <div key={c.id} className="relative shrink-0 group flex">
              <button
                type="button"
                onClick={() => onSelectClip(i)}
                style={{ width: clipWidth }}
                className={`h-32 shrink-0 overflow-hidden relative cursor-pointer outline-none bg-[#333] ${
                  selectedClipIndex === i
                    ? "ring-[3px] ring-inset ring-white z-10"
                    : "border-r border-black/20"
                }`}
              >
                <div className="flex h-full w-full">
                  {Array.from({ length: numThumbnails }).map((_, idx) => {
                    if (isVideo(c.type)) {
                      const offsetIdx = Math.floor((c.trimStart * pixelsPerSecond) / 128) + idx;
                      const thumbUrl = thumbnails[c.url]?.[offsetIdx];
                      return thumbUrl ? (
                        <img key={idx} src={thumbUrl} alt="" className="h-full w-32 shrink-0 object-cover pointer-events-none opacity-80 transition-opacity duration-300" />
                      ) : (
                        <div key={idx} className="h-full w-32 shrink-0 bg-[#222] border-r border-[#333] animate-pulse" />
                      );
                    }
                    return (
                      <img key={idx} src={c.url} alt="" className="h-full w-32 shrink-0 object-cover pointer-events-none" crossOrigin="anonymous" />
                    );
                  })}
                </div>
              </button>

              {selectedClipIndex === i && (
                <>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-4 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-l-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]"
                    onPointerDown={(e) => onStartTrim(e, i, "start")}
                  >
                    <div className="w-[2px] h-4 bg-black/40 rounded-full" />
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-4 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-r-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]"
                    onPointerDown={(e) => onStartTrim(e, i, "end")}
                  >
                    <div className="w-[2px] h-4 bg-black/40 rounded-full" />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="w-[50vw] shrink-0" />
    </div>
  );
}
