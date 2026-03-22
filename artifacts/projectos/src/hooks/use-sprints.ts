import {
  useListSprints,
  useCreateSprint,
  useUpdateSprint,
  getListSprintsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListSprintsParams } from "@workspace/api-client-react";

export function useSprints(params?: ListSprintsParams) {
  return useListSprints(params);
}

export function useCreateSprintMutation() {
  const queryClient = useQueryClient();
  return useCreateSprint({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSprintsQueryKey() });
      },
    },
  });
}

export function useUpdateSprintMutation() {
  const queryClient = useQueryClient();
  return useUpdateSprint({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSprintsQueryKey() });
      },
    },
  });
}
