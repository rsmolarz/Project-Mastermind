import {
  useListMembers,
  useCreateMember,
  useUpdateMember,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useMembers() {
  return useListMembers();
}

export function useCreateMemberMutation() {
  const queryClient = useQueryClient();
  return useCreateMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
    },
  });
}

export function useUpdateMemberMutation() {
  const queryClient = useQueryClient();
  return useUpdateMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
    },
  });
}
