import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "@/lib/api";
import { requestTossPayment } from "@/lib/toss";
import type { Purchase, PurchaseOrder, PurchaseSource, Paginated } from "@/lib/types";

export function useMyPurchases(page = 1) {
  return useQuery<Paginated<Purchase>>({
    queryKey: ["purchases", "me", page],
    queryFn: () =>
      api.get<Paginated<Purchase>>(`/purchases/me?page=${page}&limit=20`),
    enabled: !!getToken(),
  });
}

export function useCreatePurchase() {
  return useMutation({
    mutationFn: async (data: { postId: number; price: number; title: string }) => {
      const order = await api.post<PurchaseOrder>("/purchases", {
        postId: data.postId,
      });
      await requestTossPayment({
        amount: data.price,
        orderId: order.orderId,
        orderName: data.title,
      });
      return order;
    },
  });
}

export function useDirectPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) =>
      api.post<Purchase>("/purchases/direct", { postId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

export function useImportVideo() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (postId: number) =>
      api.post<{ projectId: number }>(`/purchases/${postId}/import-video`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
      navigate("/create/editor/studio", { state: { projectId: data.projectId } });
    },
  });
}

export function usePurchaseSources(postId: number | null) {
  return useQuery<PurchaseSource[]>({
    queryKey: ["purchases", postId, "sources"],
    queryFn: () => api.get<PurchaseSource[]>(`/purchases/${postId}/sources`),
    enabled: !!postId && !!getToken(),
  });
}
