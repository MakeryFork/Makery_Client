import { useEffect } from "react";

interface Props {
  selectedClipIndex: number | null;
  selectedTextId: string | null;
  selectedAudioId: string | null;
  onDeleteClip: (index: number) => void;
  onDeleteText: (id: string) => void;
  onDeleteAudio: (id: string) => void;
}

export function useEditorKeyboard({
  selectedClipIndex, selectedTextId, selectedAudioId,
  onDeleteClip, onDeleteText, onDeleteAudio,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      if (selectedClipIndex !== null) onDeleteClip(selectedClipIndex);
      else if (selectedTextId !== null) onDeleteText(selectedTextId);
      else if (selectedAudioId !== null) onDeleteAudio(selectedAudioId);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipIndex, selectedTextId, selectedAudioId, onDeleteClip, onDeleteText, onDeleteAudio]);
}
