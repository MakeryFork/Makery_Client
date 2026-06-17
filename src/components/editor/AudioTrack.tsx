import type { AudioClip } from "./types";

interface Props {
  audios: AudioClip[];
  selectedAudioId: string | null;
  maxDuration: number;
  pixelsPerSecond: number;
  isMuted: boolean;
  audioInputRef: React.RefObject<HTMLInputElement>;
  audioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  onSelectAudio: (id: string | null) => void;
  onStartAudioTrim: (e: React.PointerEvent, id: string, type: "start" | "end") => void;
  onAddAudio: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AudioTrack({
  audios, selectedAudioId, maxDuration, pixelsPerSecond,
  isMuted, audioInputRef, audioRefs,
  onSelectAudio, onStartAudioTrim, onAddAudio,
}: Props) {
  return (
    <>
      <div className="w-full h-16 flex items-center border-b border-[#DDE2E8]">
        <div className="w-[50vw] shrink-0 border-r border-[#DDE2E8]" />
        <div className="relative flex-1 h-full" style={{ minWidth: maxDuration * pixelsPerSecond }}>
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
              {audios.map((clip) => {
                const left = clip.startTime * pixelsPerSecond;
                const width = (clip.endTime - clip.startTime) * pixelsPerSecond;
                const isSelected = selectedAudioId === clip.id;
                return (
                  <div
                    key={clip.id}
                    className={`absolute top-1 bottom-1 rounded-md flex items-center overflow-hidden cursor-pointer ${isSelected ? "ring-2 ring-[#FFCA1D]" : ""}`}
                    style={{ left, width, background: "#A8D8A8", minWidth: 16 }}
                    onClick={() => onSelectAudio(selectedAudioId === clip.id ? null : clip.id)}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize bg-black/20 flex items-center justify-center z-10"
                      onPointerDown={(e) => onStartAudioTrim(e, clip.id, "start")}
                    >
                      <div className="w-[2px] h-3 bg-white/80 rounded-full" />
                    </div>
                    <span className="mx-3 font-paperlogy text-xs text-[#2a6b2a] truncate select-none">{clip.name}</span>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize bg-black/20 flex items-center justify-center z-10"
                      onPointerDown={(e) => onStartAudioTrim(e, clip.id, "end")}
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

      {audios.map((clip) => (
        <audio
          key={clip.id}
          ref={(el) => { if (el) audioRefs.current.set(clip.id, el); else audioRefs.current.delete(clip.id); }}
          src={clip.url}
          muted={isMuted}
          preload="auto"
          style={{ display: "none" }}
        />
      ))}
      <input ref={audioInputRef} type="file" accept="audio/*" onChange={onAddAudio} style={{ display: "none" }} />
    </>
  );
}
