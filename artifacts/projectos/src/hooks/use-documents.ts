import {
  useListDocuments,
  useGetDocument,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  getListDocumentsQueryKey,
  getGetDocumentQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListDocumentsParams } from "@workspace/api-client-react";

export function useDocuments(params?: ListDocumentsParams) {
  return useListDocuments(params);
}

export function useDocument(id: number) {
  return useGetDocument(id);
}

export function useCreateDocumentMutation() {
  const queryClient = useQueryClient();
  return useCreateDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      },
    },
  });
}

export function useUpdateDocumentMutation() {
  const queryClient = useQueryClient();
  return useUpdateDocument({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(variables.id) });
      },
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();
  return useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      },
    },
  });
}
