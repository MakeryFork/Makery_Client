import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import PostDetailModal from "@/components/PostDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { useUserPosts } from "@/hooks/usePosts";
import { useVideoProjects } from "@/hooks/useVideoProjects";
import type { Post } from "@/lib/types";

export default function Create() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { data: postsData, isLoading: postsLoading } = useUserPosts(user?.id);
  const { data: projectsData, isLoading: projectsLoading } = useVideoProjects();

  const posts = postsData?.items ?? [];
  const projects = projectsData?.items ?? [];
  const isLoading = postsLoading || projectsLoading;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      {/* Banner */}
      <section className="px-4 sm:px-[4.5%] mt-2 sm:mt-3 lg:mt-4">
        <div className="relative w-full rounded-[16px] lg:rounded-[22px] overflow-hidden h-[340px] sm:h-[400px] lg:h-[510px]">
          <img
            src="/explore-banner.png"
            alt="New Project"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-10 flex items-end justify-center pb-8 sm:pb-10 lg:pb-12">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/create/post"
                className="inline-flex rounded-full bg-[#FFCA1D] px-7 py-2.5 font-paperlogy text-sm font-bold text-white shadow-md transition-colors hover:bg-[#e6b800] sm:px-9 sm:py-3 sm:text-base lg:px-11 lg:text-lg"
              >
                Create Post
              </Link>
              <Link
                to="/create/editor"
                className="inline-flex rounded-full bg-[#FFCA1D] px-7 py-2.5 font-paperlogy text-sm font-bold text-white shadow-md transition-colors hover:bg-[#e6b800] sm:px-9 sm:py-3 sm:text-base lg:px-11 lg:text-lg"
              >
                Editor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Projects section (Posts + Video Projects combined) */}
      <section className="px-4 sm:px-[5%] mt-6 pb-16">
        <h2 className="font-paperlogy font-semibold text-black text-lg sm:text-xl mb-6 sm:mb-8">
          Projects
        </h2>

        {!isLoggedIn ? (
          <p className="text-center font-paperlogy text-[#9E9E9E] py-12">
            Sign in to see your projects.
          </p>
        ) : isLoading ? (
          <div className="grid grid-cols-4 gap-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square w-full rounded-[12px] bg-[#F0F0F0] mb-2" />
                <div className="h-3 w-2/3 rounded bg-[#F0F0F0]" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 && projects.length === 0 ? (
          <p className="text-center font-paperlogy text-[#9E9E9E] py-12">No projects yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4 lg:gap-6">
            {/* Posts */}
            {posts.map((post) => (
              <div key={`post-${post.id}`} className="flex flex-col">
                <button
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-square w-full rounded-[12px] overflow-hidden bg-[#F0F0F0] mb-2 hover:opacity-90 transition-opacity"
                >
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#BDBDBD]">
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                    </div>
                  )}
                  {post.price > 0 && (
                    <span className="absolute bottom-1.5 right-2 font-paperlogy text-[11px] font-semibold text-white drop-shadow">
                      ₩{post.price.toLocaleString()}
                    </span>
                  )}
                </button>
                <p className="font-paperlogy text-sm text-black truncate">{post.title}</p>
                <p className="font-paperlogy text-xs text-[#BDBDBD]">
                  {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
            ))}

            {/* Video Projects */}
            {projects.map((project) => {
              const mins = Math.floor(project.duration / 60);
              const secs = Math.floor(project.duration % 60);
              return (
                <div key={`proj-${project.id}`} className="flex flex-col">
                  <button
                    onClick={() => navigate("/create/editor/studio", { state: { projectId: project.id } })}
                    className="relative aspect-square w-full rounded-[12px] overflow-hidden bg-[#F0F0F0] mb-2 hover:opacity-90 transition-opacity"
                  >
                    {project.thumbnailUrl ? (
                      <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#BDBDBD]">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    )}
                    <span className="absolute bottom-1.5 right-2 font-paperlogy text-[11px] font-semibold text-white drop-shadow">
                      {mins}:{String(secs).padStart(2, "0")}
                    </span>
                  </button>
                  <p className="font-paperlogy text-sm text-black truncate">{project.title}</p>
                  <p className="font-paperlogy text-xs text-[#BDBDBD]">
                    {new Date(project.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PostDetailModal
        post={selectedPost}
        open={selectedPost != null}
        onOpenChange={(open) => { if (!open) setSelectedPost(null); }}
      />
    </div>
  );
}
