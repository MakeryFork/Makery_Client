import { useEffect, useRef } from "react";
import { Check, Upload, X } from "lucide-react";
import type { ExportPhase } from "@/hooks/useExport";

interface Props {
  isExporting: boolean;
  progress: number;
  isDone: boolean;
  phase: ExportPhase;
  onClose: () => void;
}

export default function ExportProgressModal({ isExporting, progress, isDone, phase, onClose }: Props) {
  const visible = isExporting || isDone;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isDone) closeRef.current?.focus();
  }, [isDone]);

  if (!visible) return null;

  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (progress / 100) * circumference;

  const phaseLabel =
    phase === "saving" ? "편집 데이터 저장 중..." :
    progress < 40 ? "파일 준비 중..." :
    progress < 90 ? "인코딩 중..." : "마무리 중...";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex w-80 flex-col items-center gap-5 rounded-3xl bg-white px-8 py-8 shadow-2xl">

        {isDone && (
          <button
            ref={closeRef}
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F0] text-gray-400 hover:bg-[#E0E0E0] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* 원형 인디케이터 */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg className="-rotate-90 absolute inset-0" width="112" height="112" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="40" fill="none" stroke="#F0F0F0" strokeWidth="7" />
            {phase === "saving" ? (
              /* 업로드 중: 전체 채운 상태로 스핀 */
              <circle
                cx="56" cy="56" r="40"
                fill="none" stroke="#FFCA1D" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
                className="animate-spin origin-[56px_56px]"
                style={{ animationDuration: "1s" }}
              />
            ) : isDone ? (
              <circle
                cx="56" cy="56" r="40"
                fill="none" stroke="#FFCA1D" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={0}
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            ) : (
              <circle
                cx="56" cy="56" r="40"
                fill="none" stroke="#FFCA1D" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            )}
          </svg>

          <div className="relative z-10 flex items-center justify-center">
            {isDone ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFCA1D]">
                <Check className="h-6 w-6 text-white" strokeWidth={3} />
              </div>
            ) : phase === "saving" ? (
              <Upload className="h-8 w-8 text-[#FFCA1D]" strokeWidth={1.5} />
            ) : (
              <span className="font-paperlogy text-2xl font-bold text-[#333]">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* 텍스트 */}
        {isDone ? (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="font-paperlogy text-lg font-bold text-[#222]">완료!</p>
            <p className="font-paperlogy text-sm text-[#888]">다운로드 및 업로드가 완료됐어요</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-paperlogy text-base font-bold text-[#222]">
              {phase === "saving" ? "서버 업로드 중..." : "영상 처리 중..."}
            </p>
            <p className="font-paperlogy text-xs text-[#999]">잠시만 기다려 주세요</p>
          </div>
        )}

        {/* 진행 바 (인코딩 중에만) */}
        {!isDone && phase !== "saving" && (
          <div className="w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F0F0]">
              <div
                className="h-full rounded-full bg-[#FFCA1D] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-center font-paperlogy text-[11px] text-[#BDBDBD]">
              {phaseLabel}
            </p>
          </div>
        )}

        {/* 업로드 중: 스피너 바 */}
        {!isDone && phase === "saving" && (
          <div className="w-full overflow-hidden rounded-full bg-[#F0F0F0] h-1.5">
            <div className="h-full bg-[#FFCA1D] rounded-full animate-pulse" style={{ width: "100%" }} />
          </div>
        )}

        {isDone && (
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-[#FFCA1D] py-3 font-paperlogy text-sm font-bold text-white hover:bg-[#e6b800] transition-colors"
          >
            확인
          </button>
        )}
      </div>
    </div>
  );
}
