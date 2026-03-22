import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getListTasksQueryKey } from "@workspace/api-client-react";

const API = `${import.meta.env.BASE_URL}api`;

export function useBulkTaskAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { taskIds: number[]; action: "delete" | "update"; data?: Record<string, unknown> }) => {
      const res = await fetch(`${API}/tasks/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    },
  });
}
