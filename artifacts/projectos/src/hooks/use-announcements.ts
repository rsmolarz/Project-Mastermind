import {
  useListAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useReactToAnnouncement,
  useCommentOnAnnouncement,
  getListAnnouncementsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListAnnouncementsParams } from "@workspace/api-client-react";

export function useAnnouncements(params?: ListAnnouncementsParams) {
  return useListAnnouncements(params);
}

export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
      },
    },
  });
}

export function useUpdateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useUpdateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
      },
    },
  });
}

export function useReactToAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useReactToAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
      },
    },
  });
}

export function useCommentOnAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useCommentOnAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
      },
    },
  });
}
