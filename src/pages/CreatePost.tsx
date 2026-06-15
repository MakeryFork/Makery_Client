import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Plus, X } from "lucide-react";
import BuyersMarkdownEditor from "@/components/BuyersMarkdownEditor";
import { useCreatePost } from "@/hooks/usePosts";
import { useExportVideo } from "@/hooks/useVideoProjects";
import { BASE_URL, getToken } from "@/lib/api";

interface EditorClip {
  type: "video" | "image";
  url: string;
  name: string;
}

async function uploadFile(file: File): Promise<string> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Upload failed");
  return json.data.url as string;
}

async function blobUrlToFile(blobUrl: string, name: string, type: string): Promise<File> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new File([blob], name, { type });
}

export default function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    fromEditor?: boolean;
    clips?: EditorClip[];
    projectId?: number;
  } | null;

  const fromEditor = state?.fromEditor ?? false;
  const editorClips = state?.clips ?? [];
  const projectId = state?.projectId;

  const [tab, setTab] = useState<"public" | "buyers">("public");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [details, setDetails] = useState<string[]>([""]);
  const [buyersMarkdown, setBuyersMarkdown] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const descRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = "auto";
      descRef.current.style.height = descRef.current.scrollHeight + "px";
    }
  }, [description]);

  // Auto-upload first image as thumbnail
  useEffect(() => {
    const firstImage = files.find((f) => f.type.startsWith("image/"));
    if (firstImage) {
      uploadFile(firstImage).then(setThumbnailUrl).catch(console.error);
    }
  }, [files]);

  const handleFileSelect = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    setFiles((prev) => [...prev, ...arr]);
    setPreviewUrls((prev) => [
      ...prev,
      ...arr.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const editorPreviews = fromEditor ? editorClips : [];

  const allPreviews = fromEditor
    ? editorPreviews.map((c) => ({ url: c.url, type: c.type }))
    : previewUrls.map((url, i) => ({
        url,
        type: files[i]?.type.startsWith("video/") ? "video" : "image",
      }));

  const createPost = useCreatePost();
  const exportVideo = useExportVideo();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError("");

    try {
      let downloadUrl: string | null = null;
      let vpId = projectId;

      if (fromEditor && projectId && editorClips.length > 0) {
        const videoClip = editorClips.find((c) => c.type === "video");
        if (videoClip) {
          const file = await blobUrlToFile(videoClip.url, "export.mp4", "video/mp4");
          const result = await exportVideo.mutateAsync({ projectId, file });
          downloadUrl = result.downloadUrl;
        }
      }

      await createPost.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
        price,
        details: details
          .filter((d) => d.trim())
          .map((content, sortOrder) => ({ content, sortOrder })),
        buyerContent: buyersMarkdown
          ? { title: title.trim(), markdownContent: buyersMarkdown }
          : undefined,
        videoProjectId: vpId,
      });

      if (downloadUrl) {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "makery-export.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      navigate("/create");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#F0F0F0]">
        <div className="flex items-center justify-between px-4 sm:px-[5%] h-[60px]">
          {/* Tabs */}
          <div className="flex gap-6">
            {(["public", "buyers"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-paperlogy text-sm font-semibold pb-0.5 border-b-2 transition-colors ${
                  tab === t
                    ? "text-black border-black"
                    : "text-[#9E9E9E] border-transparent"
                }`}
              >
                {t === "public" ? "Public" : "For Buyers"}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/create")}
              className="px-4 py-2 font-paperlogy text-sm text-[#757575] hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="px-5 py-2 bg-[#FFCA1D] text-white font-paperlogy font-semibold text-sm rounded-xl hover:bg-[#e6b800] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 sm:px-[5%] py-2">
          <p className="text-red-500 text-sm font-paperlogy">{error}</p>
        </div>
      )}

      {tab === "public" && (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)]">
          {/* Left: Media */}
          <div className="lg:w-1/2 lg:border-r border-[#F0F0F0] p-6">
            {fromEditor ? (
              <>
                {allPreviews.length > 0 && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
                    {allPreviews[currentIdx].type === "video" ? (
                      <video
                        src={allPreviews[currentIdx].url}
                        className="w-full h-full object-contain"
                        controls
                      />
                    ) : (
                      <img
                        src={allPreviews[currentIdx].url}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    )}
                    {allPreviews.length > 1 && (
                      <button
                        onClick={() => setCurrentIdx((i) => (i + 1) % allPreviews.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => navigate("/create/editor")}
                  className="w-full py-2.5 border-2 border-[#D8D8D8] rounded-xl font-paperlogy text-sm text-[#757575] hover:border-[#FFCA1D] transition-colors"
                >
                  Edit Again
                </button>
              </>
            ) : (
              <>
                {previewUrls.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-[#D8D8D8] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#FFCA1D] transition-colors"
                  >
                    <Plus className="w-10 h-10 text-[#BDBDBD]" />
                    <p className="font-paperlogy text-sm text-[#9E9E9E]">
                      Select videos and photos.
                    </p>
                    <button className="px-5 py-2 bg-[#FFCA1D] text-white font-paperlogy text-sm font-semibold rounded-xl">
                      Open File
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-3">
                      {files[currentIdx]?.type.startsWith("video/") ? (
                        <video
                          src={previewUrls[currentIdx]}
                          className="w-full h-full object-contain"
                          controls
                        />
                      ) : (
                        <img
                          src={previewUrls[currentIdx]}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      )}
                      {previewUrls.length > 1 && (
                        <button
                          onClick={() => setCurrentIdx((i) => (i + 1) % previewUrls.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 border-2 border-dashed border-[#D8D8D8] rounded-xl font-paperlogy text-sm text-[#9E9E9E] hover:border-[#FFCA1D] transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add photo
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </>
            )}
          </div>

          {/* Right: Form */}
          <div className="lg:w-1/2 p-6 space-y-5">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title"
              className="w-full border-none outline-none font-paperlogy font-semibold text-2xl sm:text-3xl text-black placeholder:text-[#BDBDBD]"
            />

            {/* Description */}
            <div>
              <textarea
                ref={descRef}
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 10000) setDescription(e.target.value);
                }}
                placeholder="Description (optional)"
                rows={3}
                className="w-full resize-none border border-[#D8D8D8] rounded-md p-3 font-paperlogy text-sm text-black placeholder:text-[#BDBDBD] focus:border-[#FFCA1D] outline-none overflow-hidden"
              />
              <p className="text-right text-xs text-[#BDBDBD] font-paperlogy">
                {description.length}/10000
              </p>
            </div>

            {/* Price */}
            <div>
              <label className="font-paperlogy text-sm font-semibold text-black block mb-1">
                Price
              </label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="0 = Free"
                className="border border-[#D8D8D8] rounded-md px-3 py-2 font-paperlogy text-sm text-black focus:border-[#FFCA1D] outline-none w-40"
              />
            </div>

            {/* Thumbnail preview */}
            {thumbnailUrl && (
              <div>
                <p className="font-paperlogy text-sm font-semibold text-black mb-1">Thumbnail</p>
                <img
                  src={thumbnailUrl}
                  alt="thumbnail"
                  className="w-24 h-24 rounded-xl object-cover border border-[#D8D8D8]"
                />
              </div>
            )}

            {/* Detail lines */}
            <div>
              <label className="font-paperlogy text-sm font-semibold text-black block mb-2">
                Details
              </label>
              <div className="space-y-2">
                {details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={d}
                      onChange={(e) => {
                        const next = [...details];
                        next[i] = e.target.value;
                        setDetails(next);
                      }}
                      placeholder={`Detail ${i + 1}`}
                      className="flex-1 border border-[#D8D8D8] rounded-md px-3 py-2 font-paperlogy text-sm text-black focus:border-[#FFCA1D] outline-none"
                    />
                    {details.length > 1 && (
                      <button
                        onClick={() => setDetails(details.filter((_, j) => j !== i))}
                        className="p-1 text-[#BDBDBD] hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setDetails([...details, ""])}
                className="mt-2 flex items-center gap-1 text-xs text-[#FFCA1D] font-paperlogy font-semibold hover:opacity-80"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "buyers" && (
        <div className="px-4 sm:px-[5%] py-6">
          <div className="mb-4">
            <label className="font-paperlogy text-sm font-semibold text-black block mb-1">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="w-full border border-[#D8D8D8] rounded-md px-3 py-2 font-paperlogy text-sm text-black focus:border-[#FFCA1D] outline-none"
            />
          </div>
          <BuyersMarkdownEditor
            title="Buyer-Only Content"
            value={buyersMarkdown}
            onChange={setBuyersMarkdown}
          />
        </div>
      )}
    </div>
  );
}
