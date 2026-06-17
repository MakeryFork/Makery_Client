import type { CSSProperties } from "react";
import type { ClipEffects } from "./types";
import { FILTER_PRESETS } from "./types";

export function isVideo(t: string): boolean {
  return t === "video" || t.startsWith("video/");
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function defaultEffects(): ClipEffects {
  return { rotate: 0, flipH: false, flipV: false, filter: "none" };
}

export function getEffectStyle(effects?: ClipEffects): CSSProperties {
  if (!effects) return {};
  const transforms: string[] = [];
  if (effects.rotate) transforms.push(`rotate(${effects.rotate}deg)`);
  if (effects.flipH) transforms.push("scaleX(-1)");
  if (effects.flipV) transforms.push("scaleY(-1)");
  const filterCss = FILTER_PRESETS.find((f) => f.key === effects.filter)?.css ?? "";
  return {
    ...(transforms.length ? { transform: transforms.join(" ") } : {}),
    ...(filterCss ? { filter: filterCss } : {}),
  };
}
