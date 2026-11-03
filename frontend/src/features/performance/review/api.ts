import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components, operations } from '@/api/generated/schema';

type Schemas = components['schemas'];
export type ReviewRow = Schemas['ReviewRow'];
export type ReviewStatus = ReviewRow['status'];
export type CorrectInput = Schemas['CorrectInput'];
export type ReviewFilters = NonNullable<operations['listReviewRows']['parameters']['query']>;

export const reviewKeys = {
  all: ['performance', 'review-rows'] as const,
  list: (filters: ReviewFilters) => ['performance', 'review-rows', 'list', filters] as const,
};

export function useReviewRows(filters: ReviewFilters) {
  return useQuery({
    queryKey: reviewKeys.list(filters),
    queryFn: () => call(api.GET('/api/v1/performance/review-rows', { params: { query: filters } })),
    placeholderData: keepPreviousData,
  });
}

function useAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['performance', 'sources'] }),
    ]);
}

export function useDismissRow(rowId: string) {
  const afterChange = useAfterChange();
  return useMutation({
    mutationFn: (comment: string) =>
      call(
        api.POST('/api/v1/performance/review-rows/{rowId}/dismiss', {
          params: { path: { rowId } },
          body: { comment },
        }),
      ),
    onSuccess: afterChange,
  });
}

export function useReopenRow(rowId: string) {
  const afterChange = useAfterChange();
  return useMutation({
    mutationFn: () =>
      call(
        api.POST('/api/v1/performance/review-rows/{rowId}/reopen', {
          params: { path: { rowId } },
        }),
      ),
    onSuccess: afterChange,
  });
}

export function useCorrectRow(rowId: string) {
  const afterChange = useAfterChange();
  return useMutation({
    mutationFn: (body: CorrectInput) =>
      call(
        api.POST('/api/v1/performance/review-rows/{rowId}/correct', {
          params: { path: { rowId } },
          body,
        }),
      ),
    onSuccess: afterChange,
  });
}
