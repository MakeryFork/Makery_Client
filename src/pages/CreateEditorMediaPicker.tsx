import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X } from "lucide-react";
import AppHeader from "@/components/AppHeader";

interface EditorStudioClip {
  type: "video" | "image";
  url: string;
  name: string;
}

export default function CreateEditorMediaPicker() {
  const navigate = useNavigate();
  const [clips, setClips] = useState<EditorStudioClip[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList) => {
    const arr = Array.from(fileList);
    const newClips: EditorStudioClip[] = arr
      .filter((f) => f.type.startsWith("video/") || f.type.startsWith("image/"))
      .map((f) => ({
        type: f.type.startsWith("video/") ? "video" : "image",
        url: URL.createObjectURL(f),
        name: f.name,
      }));
    setClips((prev) => [...prev, ...newClips]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const removeClip = (index: number) => {
    setClips((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    if (clips.length === 0) return;
    navigate("/create/editor/studio", { state: { clips } });
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="px-4 sm:px-[5%] py-8 max-w-3xl mx-auto">
        <h1 className="font-paperlogy font-bold text-2xl text-black mb-2">Video Editor</h1>
        <p className="font-paperlogy text-sm text-[#9E9E9E] mb-6">
          Add videos or images to start editing.
        </p>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 h-48 cursor-pointer transition-colors mb-6 ${
            isDragging
              ? "border-[#FFCA1D] bg-[#FFFBEB]"
              : "border-[#D8D8D8] hover:border-[#FFCA1D] hover:bg-[#FFFBEB]"
          }`}
        >
          <Upload className="w-10 h-10 text-[#BDBDBD]" />
          <p className="font-paperlogy text-sm text-[#9E9E9E]">
            Drag files here or click to add
          </p>
          <p className="font-paperlogy text-xs text-[#BDBDBD]">
            MP4, MOV, WebM, JPG, PNG, GIF
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        {/* File list */}
        {clips.length > 0 && (
          <div className="space-y-2 mb-6">
            {clips.map((clip, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-[#F4F5F7] rounded-xl"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#E0E0E0] flex-shrink-0">
                  {clip.type === "video" ? (
                    <video src={clip.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={clip.url} alt={clip.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="flex-1 font-paperlogy text-sm text-black truncate">{clip.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeClip(i);
                  }}
                  className="p-1 text-[#BDBDBD] hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={clips.length === 0}
          className="w-full py-3 bg-[#FFCA1D] text-white font-paperlogy font-semibold rounded-xl hover:bg-[#e6b800] transition-colors disabled:opacity-40"
        >
          Start Editing →
        </button>
      </div>
    </div>
  );
}
