import { useEffect, useRef, useState } from "react";
import type { OverlayText } from "./types";

interface Props {
  textItem: OverlayText;
  onUpdate: (t: OverlayText) => void;
}

export function DraggableText({ textItem, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: textItem.x, initY: textItem.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onUpdate({ ...textItem, x: dragRef.current.initX + dx, y: dragRef.current.initY + dy });
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
  }, [isDragging, textItem, onUpdate]);

  if (isEditing) {
    return (
      <input
        autoFocus
        className="absolute z-50 text-white font-paperlogy text-3xl font-bold bg-black/40 outline-none border border-white/50 px-2 py-1 rounded shadow-lg"
        style={{
          left: "50%", top: "50%",
          transform: `translate(calc(-50% + ${textItem.x}px), calc(-50% + ${textItem.y}px))`,
          textShadow: "0 2px 4px rgba(0,0,0,0.8)",
        }}
        value={textItem.text}
        onChange={(e) => onUpdate({ ...textItem, text: e.target.value })}
        onBlur={() => setIsEditing(false)}
        onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(false); }}
      />
    );
  }

  return (
    <div
      className={`absolute cursor-move select-none z-50 text-white font-paperlogy text-3xl font-bold px-2 py-1 rounded transition-shadow ${
        isDragging ? "ring-2 ring-white/80 bg-white/10" : "hover:ring-1 hover:ring-white/50"
      }`}
      style={{
        left: "50%", top: "50%",
        transform: `translate(calc(-50% + ${textItem.x}px), calc(-50% + ${textItem.y}px))`,
        textShadow: "0 2px 4px rgba(0,0,0,0.8)",
        whiteSpace: "nowrap",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
    >
      {textItem.text}
    </div>
  );
}
