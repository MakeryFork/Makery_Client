import { useEffect, useRef } from "react";
import { Check, Download, X } from "lucide-react";

interface Props {
  isExporting: boolean;
  progress: number;
  isDone: boolean;
  onClose: () => void;
}

export default function ExportProgressModal({ isExporting, progress, isDone, onClose }: Props) {
  const visible = isExporting || isDone;
  const prevDone = useRef(false);

  // Auto-focus close button when done
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isDone && !prevDone.current) {
      closeRef.current?.focus();
    }
    prevDone.current = isDone;
  }, [isDone]);

  if (!visible) return null;

  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex w-80 flex-col items-center gap-5 rounded-3xl bg-white px-8 py-8 shadow-2xl">

        {/* Done: close button */}
        {isDone && (
          <button
            ref={closeRef}
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F0] text-gray-400 hover:bg-[#E0E0E0] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Circle indicator */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg className="-rotate-90 absolute inset-0" width="112" height="112" viewBox="0 0 112 112">
            {/* Track */}
            <circle
              cx="56" cy="56" r="40"
              fill="none"
              stroke="#F0F0F0"
              strokeWidth="7"
            />
            {/* Progress */}
            {isDone ? (
              <circle
                cx="56" cy="56" r="40"
                fill="none"
                stroke="#FFCA1D"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={0}
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            ) : (
              <circle
                cx="56" cy="56" r="40"
                fill="none"
                stroke="#FFCA1D"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            )}
          </svg>

          {/* Center icon */}
          <div className="relative z-10 flex items-center justify-center">
            {isDone ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFCA1D]">
                <Check className="h-6 w-6 text-white" strokeWidth={3} />
              </div>
            ) : (
              <span className="font-paperlogy text-2xl font-bold text-[#333]">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* Text */}
        {isDone ? (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="font-paperlogy text-lg font-bold text-[#222]">저장 완료!</p>
            <div className="flex items-center gap-1.5 text-sm text-[#888]">
              <Download className="h-3.5 w-3.5" />
              <span className="font-paperlogy">makery_video.mp4</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-paperlogy text-base font-bold text-[#222]">영상 저장 중...</p>
            <p className="font-paperlogy text-xs text-[#999]">잠시만 기다려 주세요</p>
          </div>
        )}

        {/* Done: confirm button */}
        {isDone && (
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-[#FFCA1D] py-3 font-paperlogy text-sm font-bold text-white hover:bg-[#e6b800] transition-colors"
          >
            확인
          </button>
        )}

        {/* Exporting: progress bar */}
        {!isDone && (
          <div className="w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F0F0]">
              <div
                className="h-full rounded-full bg-[#FFCA1D] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-center font-paperlogy text-[11px] text-[#BDBDBD]">
              {progress < 40 ? "파일 준비 중..." : progress < 90 ? "인코딩 중..." : "마무리 중..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
