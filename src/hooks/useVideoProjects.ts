import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getToken, BASE_URL } from "@/lib/api";
import type { VideoProject, Paginated } from "@/lib/types";

export function useVideoProjects(page = 1) {
  return useQuery<Paginated<VideoProject>>({
    queryKey: ["video-projects", page],
    queryFn: () =>
      api.get<Paginated<VideoProject>>(`/video-projects?page=${page}&limit=20`),
    enabled: !!getToken(),
  });
}

export function useVideoProject(id: number | null) {
  return useQuery<VideoProject>({
    queryKey: ["video-projects", id],
    queryFn: () => api.get<VideoProject>(`/video-projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateVideoProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      thumbnailUrl?: string;
      duration?: number;
      editData: object;
    }) => api.post<VideoProject>("/video-projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
    },
  });
}

export function useUpdateVideoProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { title?: string; thumbnailUrl?: string; duration?: number; editData?: object };
    }) => api.patch<VideoProject>(`/video-projects/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["video-projects", id] });
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
    },
  });
}

export function useDeleteVideoProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/video-projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
    },
  });
}

export function useExportVideo() {
  return useMutation({
    mutationFn: async ({
      projectId,
      file,
    }: {
      projectId: number;
      file: File;
    }) => {
      const token = getToken();
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch(`${BASE_URL}/video-projects/${projectId}/export`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Export failed");
      return json.data as { downloadUrl: string };
    },
  });
}
