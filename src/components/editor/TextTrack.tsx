import type { OverlayText } from "./types";

interface Props {
  texts: OverlayText[];
  selectedTextId: string | null;
  maxDuration: number;
  pixelsPerSecond: number;
  onSelectText: (id: string) => void;
  onAddText: () => void;
  onStartTextTrim: (e: React.PointerEvent, id: string, type: "start" | "end") => void;
}

export function TextTrack({ texts, selectedTextId, maxDuration, pixelsPerSecond, onSelectText, onAddText, onStartTextTrim }: Props) {
  return (
    <div className="mt-2 w-full h-16 flex items-center border-y border-[#DDE2E8]">
      <div className="w-[50vw] shrink-0 border-r border-[#DDE2E8]" />
      <div className="relative shrink-0 h-full bg-[#E6E8EA]" style={{ width: maxDuration * pixelsPerSecond }}>
        <button
          type="button"
          onClick={onAddText}
          className="absolute inset-0 flex items-center px-4 font-paperlogy text-sm font-medium text-[#6B7680] hover:bg-[#D5D8DC] transition-colors outline-none w-full text-left"
        >
          + Add Text
        </button>

        {texts.map((t) => (
          <div
            key={t.id}
            onPointerDown={(e) => { e.stopPropagation(); onSelectText(t.id); }}
            className={`absolute top-2 bottom-2 rounded bg-[#FFCA1D] text-[#333] px-2 py-1 text-xs font-bold overflow-hidden shadow-sm z-10 select-none flex items-center ${
              selectedTextId === t.id ? "ring-[3px] ring-white" : "border border-[#D4A30A]"
            }`}
            style={{ left: t.startTime * pixelsPerSecond, width: (t.endTime - t.startTime) * pixelsPerSecond }}
          >
            <span className="truncate">{t.text}</span>
            {selectedTextId === t.id && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 w-3 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-l-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]"
                  onPointerDown={(e) => onStartTextTrim(e, t.id, "start")}
                >
                  <div className="w-[2px] h-3 bg-black/40 rounded-full" />
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-3 bg-white/90 cursor-ew-resize z-20 flex items-center justify-center rounded-r-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]"
                  onPointerDown={(e) => onStartTextTrim(e, t.id, "end")}
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
  );
}
