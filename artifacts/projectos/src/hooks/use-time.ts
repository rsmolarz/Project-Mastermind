import {
  useListTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  getListTimeEntriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListTimeEntriesParams } from "@workspace/api-client-react";

export function useTimeEntries(params?: ListTimeEntriesParams) {
  return useListTimeEntries(params);
}

export function useCreateTimeEntryMutation() {
  const queryClient = useQueryClient();
  return useCreateTimeEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      },
    },
  });
}

export function useUpdateTimeEntryMutation() {
  const queryClient = useQueryClient();
  return useUpdateTimeEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      },
    },
  });
}

export function useDeleteTimeEntryMutation() {
  const queryClient = useQueryClient();
  return useDeleteTimeEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      },
    },
  });
}
