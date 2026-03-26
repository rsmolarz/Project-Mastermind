import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const API = `${import.meta.env.BASE_URL}api`;

export function useNotifications(userId = 1) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${import.meta.env.BASE_URL}ws/notifications`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      };
      ws.onerror = () => {};
      ws.onclose = () => {};
    } catch {}
    return () => { wsRef.current?.close(); };
  }, [qc]);

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

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/notifications/${id}`, { method: "DELETE" });
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
