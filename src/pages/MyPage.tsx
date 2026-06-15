import { useState, useRef } from "react";
import { Edit2, LogOut } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PostDetailModal from "@/components/PostDetailModal";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useUserPosts } from "@/hooks/usePosts";
import { useUpdateProfile } from "@/hooks/useUsers";
import type { Post } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₩${price.toLocaleString()}`;
}

export default function MyPage() {
  const { user, isLoggedIn, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: postsData, isLoading: postsLoading } = useUserPosts(user?.id);
  const updateProfile = useUpdateProfile();

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
    setTempAvatarUrl(null);
    setEditing(true);
  };

  const handleSave = async () => {
    await updateProfile.mutateAsync({ name, bio });
    setEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTempAvatarUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="px-4 sm:px-[5%] py-8 max-w-4xl mx-auto">
        {/* Profile section */}
        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative cursor-pointer"
              onClick={() => editing && avatarInputRef.current?.click()}
            >
              <UserAvatar
                url={tempAvatarUrl ?? user?.profileImageUrl}
                name={user?.name}
                className="w-24 h-24 text-2xl"
              />
              {editing && (
                <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full border border-[#D8D8D8] rounded-md px-3 py-2 font-paperlogy text-sm focus:border-[#FFCA1D] outline-none"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Bio (optional)"
                  rows={3}
                  className="w-full resize-none border border-[#D8D8D8] rounded-md px-3 py-2 font-paperlogy text-sm focus:border-[#FFCA1D] outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                    className="px-5 py-2 bg-[#FFCA1D] text-white font-paperlogy text-sm font-semibold rounded-xl hover:bg-[#e6b800] transition-colors disabled:opacity-50"
                  >
                    {updateProfile.isPending ? "Saving..." : "Save"}
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
              <>
                <h2 className="font-paperlogy font-bold text-2xl text-black mb-1">
                  {user?.name}
                </h2>
                {user?.bio && (
                  <p className="font-paperlogy text-sm text-[#757575] mb-3">{user.bio}</p>
                )}
                <div className="flex gap-6 mb-4">
                  <div className="text-center">
                    <p className="font-paperlogy font-bold text-lg text-black">{user?._count.posts ?? 0}</p>
                    <p className="font-paperlogy text-xs text-[#9E9E9E]">Post</p>
                  </div>
                  <div className="text-center">
                    <p className="font-paperlogy font-bold text-lg text-black">{user?._count.followers ?? 0}</p>
                    <p className="font-paperlogy text-xs text-[#9E9E9E]">Follower</p>
                  </div>
                  <div className="text-center">
                    <p className="font-paperlogy font-bold text-lg text-black">{user?._count.following ?? 0}</p>
                    <p className="font-paperlogy text-xs text-[#9E9E9E]">Follow</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleEditStart}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#D8D8D8] text-[#757575] font-paperlogy text-sm rounded-xl hover:border-[#FFCA1D] hover:text-black transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#D8D8D8] text-[#757575] font-paperlogy text-sm rounded-xl hover:border-red-300 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Posts grid */}
        <h2 className="font-paperlogy font-semibold text-black text-lg sm:text-xl mb-4">
          My Posts
        </h2>
        {postsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square rounded-[12px] bg-[#F0F0F0] animate-pulse" />
                <div className="h-4 w-3/4 bg-[#F0F0F0] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !postsData?.items.length ? (
          <p className="text-[#9E9E9E] font-paperlogy text-sm">No posts yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {postsData.items.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="text-left group"
              >
                <div className="aspect-square rounded-[12px] overflow-hidden bg-[#F4F5F7] mb-2">
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
                <p className="font-paperlogy text-sm font-semibold text-black truncate">{post.title}</p>
                <p className="font-paperlogy text-xs text-[#9E9E9E]">{formatDate(post.createdAt)}</p>
                <p className="font-paperlogy text-xs text-[#757575]">{formatPrice(post.price)}</p>
              </button>
            ))}
          </div>
        )}
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
