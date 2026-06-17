import type { EditorStudioClip } from "@/pages/CreateEditorMediaPicker";

export type ToastType = "info" | "error";
export type CropData = { x: number; y: number; w: number; h: number };
export type FilterPreset = "none" | "grayscale" | "sepia" | "invert" | "warm" | "cool" | "vivid" | "blur";
export type ClipEffects = { rotate: 0 | 90 | 180 | 270; flipH: boolean; flipV: boolean; filter: FilterPreset };
export type TimelineClip = EditorStudioClip & {
  duration: number;
  trimStart: number;
  trimEnd: number;
  id: string;
  crop?: CropData;
  playbackRate?: number;
  effects?: ClipEffects;
};
export type OverlayText = { id: string; text: string; x: number; y: number; startTime: number; endTime: number };
export type AudioClip = { id: string; url: string; name: string; duration: number; startTime: number; endTime: number };

export const PIXELS_PER_SECOND = 128;

export const FILTER_PRESETS: { key: FilterPreset; label: string; css: string }[] = [
  { key: "none", label: "Normal", css: "" },
  { key: "vivid", label: "Vivid", css: "saturate(180%) contrast(110%)" },
  { key: "warm", label: "Warm", css: "sepia(30%) saturate(150%) hue-rotate(-10deg)" },
  { key: "cool", label: "Cool", css: "saturate(80%) hue-rotate(20deg) brightness(1.05)" },
  { key: "grayscale", label: "B&W", css: "grayscale(100%)" },
  { key: "sepia", label: "Sepia", css: "sepia(80%)" },
  { key: "invert", label: "Invert", css: "invert(100%)" },
  { key: "blur", label: "Blur", css: "blur(4px)" },
];
