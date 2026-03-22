import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = `${import.meta.env.BASE_URL}api`;

export function useNotifications(userId = 1) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const res = await fetch(`${API}/notifications?userId=${userId}`);
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/notifications/${id}/read`, { method: "PATCH" });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`${API}/notifications/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { userId: number; type: string; title: string; message?: string; link?: string }) => {
      const res = await fetch(`${API}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
