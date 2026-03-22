import {
  useListTasks,
  useGetTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTasks,
  getListTasksQueryKey,
  getGetTaskQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListTasksParams } from "@workspace/api-client-react";

export function useTasks(params?: ListTasksParams) {
  return useListTasks(params);
}

export function useTask(id: number) {
  return useGetTask(id);
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useUpdateTask({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(variables.id) });
      },
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
    },
  });
}

export function useReorderTasksMutation() {
  const queryClient = useQueryClient();
  return useReorderTasks({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
    },
  });
}
