import {
  useListGoals,
  useCreateGoal,
  useUpdateGoal,
  getListGoalsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useGoals() {
  return useListGoals();
}

export function useCreateGoalMutation() {
  const queryClient = useQueryClient();
  return useCreateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      },
    },
  });
}

export function useUpdateGoalMutation() {
  const queryClient = useQueryClient();
  return useUpdateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      },
    },
  });
}
