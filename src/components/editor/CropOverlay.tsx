import { useEffect, useRef, useState } from "react";
import type { CropData } from "./types";

interface Props {
  initialCrop?: CropData;
  onSave: (c: CropData) => void;
  onCancel: () => void;
}

export function CropOverlay({ initialCrop, onSave, onCancel }: Props) {
  const [crop, setCrop] = useState<CropData>(initialCrop ?? { x: 10, y: 10, w: 80, h: 80 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initCrop: CropData } | null>(null);

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
        if (draggingHandle === "move") { x += dx; y += dy; }
        else if (draggingHandle === "tl") { x += dx; y += dy; w -= dx; h -= dy; }
        else if (draggingHandle === "tr") { y += dy; w += dx; h -= dy; }
        else if (draggingHandle === "bl") { x += dx; w -= dx; h += dy; }
        else if (draggingHandle === "br") { w += dx; h += dy; }
        if (w < 5) w = 5;
        if (h < 5) h = 5;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + w > 100) { if (draggingHandle === "move") x = 100 - w; else w = 100 - x; }
        if (y + h > 100) { if (draggingHandle === "move") y = 100 - h; else h = 100 - y; }
        return { x, y, w, h };
      });
    };
    const onUp = () => setDraggingHandle(null);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
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
        onPointerDown={(e) => handlePointerDown(e, "move")}
      >
        <div className="absolute -left-2 -top-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, "tl")} />
        <div className="absolute -right-2 -top-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, "tr")} />
        <div className="absolute -left-2 -bottom-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, "bl")} />
        <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize shadow-md" onPointerDown={(e) => handlePointerDown(e, "br")} />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-black/40 p-2 rounded-xl backdrop-blur-md">
        <button className="px-5 py-2 bg-[#FFCA1D] text-[#333] font-bold rounded-lg text-sm transition-transform hover:scale-105" onClick={() => onSave(crop)}>Apply</button>
        <button className="px-5 py-2 bg-white text-black font-bold rounded-lg text-sm transition-transform hover:scale-105" onClick={() => onSave({ x: 0, y: 0, w: 100, h: 100 })}>Reset</button>
        <button className="px-5 py-2 bg-black/50 text-white font-bold rounded-lg text-sm transition-transform hover:scale-105" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
