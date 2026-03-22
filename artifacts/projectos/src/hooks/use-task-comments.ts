import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = `${import.meta.env.BASE_URL}api`;

export function useTaskComments(taskId: number | null) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const res = await fetch(`${API}/task-comments?taskId=${taskId}`);
      return res.json();
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { taskId: number; authorId: number; content: string; parentId?: number }) => {
      const res = await fetch(`${API}/task-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["task-comments", vars.taskId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDeleteTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: number; taskId: number }) => {
      await fetch(`${API}/task-comments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments"] });
    },
  });
}
