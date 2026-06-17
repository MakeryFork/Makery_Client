import { useState, useRef } from "react";
import { Edit2, LogOut } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PostDetailModal from "@/components/PostDetailModal";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useUserPosts } from "@/hooks/usePosts";
import { useUpdateProfile } from "@/hooks/useUsers";
import { useUploadFile } from "@/hooks/useUpload";
import type { Post } from "@/lib/types";

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `${price}$`;
}

export default function MyPage() {
  const { user, isLoggedIn, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: postsData, isLoading: postsLoading } = useUserPosts(user?.id);
  const updateProfile = useUpdateProfile();
  const uploadFile = useUploadFile();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader />
        <div className="flex items-center justify-center h-64">
          <p className="font-paperlogy text-[#9E9E9E]">Sign in required.</p>
        </div>
      </div>
    );
  }

  const handleEditStart = () => {
    setName(user?.name ?? "");
    setBio(user?.bio ?? "");
    setAvatarFile(null);
    setTempAvatarUrl(null);
    setEditing(true);
  };

  const handleSave = async () => {
    let profileImageUrl: string | undefined;
    if (avatarFile) {
      const result = await uploadFile.mutateAsync(avatarFile);
      profileImageUrl = result.url;
    }
    await updateProfile.mutateAsync({ name, bio, profileImageUrl });
    setEditing(false);
    setAvatarFile(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setTempAvatarUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      {/* 단일 컨테이너 — 프로필 + 그리드 동일 너비/패딩 */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10">

        {/* Profile section */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-10 py-12 border-b border-[#F0F0F0]">

          {/* Avatar */}
          <div
            className="relative cursor-pointer shrink-0"
            onClick={() => editing && avatarInputRef.current?.click()}
          >
            <UserAvatar
              url={tempAvatarUrl ?? user?.profileImageUrl}
              name={user?.name}
              className="w-36 h-36 text-4xl"
            />
            {editing && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <Edit2 className="w-7 h-7 text-white" />
              </div>
            )}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          {/* Info */}
          <div className="flex-1 w-full pt-1">
            {editing ? (
              <div className="space-y-3 max-w-sm">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full border border-[#D8D8D8] rounded-xl px-4 py-2.5 font-paperlogy text-sm focus:border-[#FFCA1D] outline-none"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Bio (optional)"
                  rows={3}
                  className="w-full resize-none border border-[#D8D8D8] rounded-xl px-4 py-2.5 font-paperlogy text-sm focus:border-[#FFCA1D] outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={updateProfile.isPending || uploadFile.isPending}
                    className="px-5 py-2 bg-[#FFCA1D] text-white font-paperlogy text-sm font-semibold rounded-xl hover:bg-[#e6b800] transition-colors disabled:opacity-50"
                  >
                    {uploadFile.isPending ? "Uploading..." : updateProfile.isPending ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-5 py-2 border border-[#D8D8D8] text-[#757575] font-paperlogy text-sm rounded-xl hover:bg-[#F4F5F7] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Name + buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-paperlogy font-bold text-2xl text-black tracking-tight">
                    {user?.name}
                  </h2>
                  <button
                    onClick={handleEditStart}
                    className="px-5 py-1.5 bg-[#FFCA1D] text-white font-paperlogy text-sm font-semibold rounded-xl hover:bg-[#e6b800] transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#E0E0E0] text-[#9E9E9E] font-paperlogy text-sm rounded-xl hover:border-red-300 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8">
                  {[
                    { label: "Post", value: user?._count.posts ?? 0 },
                    { label: "Follower", value: user?._count.followers ?? 0 },
                    { label: "Follow", value: user?._count.following ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center gap-0.5">
                      <span className="font-paperlogy font-bold text-xl text-black">{value}</span>
                      <span className="font-paperlogy text-xs text-[#9E9E9E]">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Bio */}
                {user?.bio && (
                  <p className="font-paperlogy text-sm text-[#757575] leading-relaxed">
                    {user.bio}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Posts grid */}
        <div className="py-8">
          <h2 className="font-paperlogy font-semibold text-black text-base mb-5">
            My Posts
          </h2>

          {postsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-square rounded-[14px] bg-[#F0F0F0] animate-pulse mb-2" />
                  <div className="h-3.5 w-2/3 bg-[#F0F0F0] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : !postsData?.items?.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#BDBDBD]">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-paperlogy text-sm">No posts yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {postsData.items.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="text-left group"
                >
                  <div className="aspect-square rounded-[14px] overflow-hidden bg-[#F4F5F7] mb-2">
                    {post.thumbnailUrl ? (
                      <img
                        src={post.thumbnailUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#BDBDBD]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-1 px-0.5">
                    <p className="font-paperlogy text-sm font-semibold text-black truncate leading-snug">{post.title}</p>
                    <p className="font-paperlogy text-xs text-[#9E9E9E] shrink-0 mt-0.5">{formatPrice(post.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        isPurchased={false}
      />
    </div>
  );
}
