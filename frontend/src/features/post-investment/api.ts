import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import { downloadFromApi } from '@/api/download';
import type { components } from '@/api/generated/schema';

export type Review = components['schemas']['PostInvestmentReview'];
export type ReviewFigures = components['schemas']['PostInvestmentReviewFigures'];
export type ReviewList = components['schemas']['PostInvestmentReviewList'];
export type ReviewUpdate = components['schemas']['PostInvestmentReviewUpdate'];
export type Money = components['schemas']['Money'];

export const reviewKeys = {
  all: ['post-investment-reviews'] as const,
  list: (activityId?: string) => ['post-investment-reviews', 'list', activityId ?? ''] as const,
  one: (id: string) => ['post-investment-reviews', id] as const,
};

function listQuery(activityId?: string) {
  return activityId ? { activityId } : {};
}

export function useReviews(activityId?: string) {
  return useQuery({
    queryKey: reviewKeys.list(activityId),
    queryFn: () =>
      call(
        api.GET('/api/v1/post-investment-reviews', { params: { query: listQuery(activityId) } }),
      ),
  });
}

export function useReview(reviewId: string) {
  return useQuery({
    queryKey: reviewKeys.one(reviewId),
    queryFn: () =>
      call(
        api.GET('/api/v1/post-investment-reviews/{reviewId}', {
          params: { path: { reviewId } },
        }),
      ),
  });
}

/** Keeps the page's copy and drops every list, which may show the changed review. */
function useStoreReview() {
  const queryClient = useQueryClient();
  return (review: Review) => {
    queryClient.setQueryData(reviewKeys.one(review.id), review);
    void queryClient.invalidateQueries({ queryKey: [...reviewKeys.all, 'list'] });
  };
}

export function useCreateReview() {
  const store = useStoreReview();
  return useMutation({
    mutationFn: (activityId: string) =>
      call(api.POST('/api/v1/post-investment-reviews', { body: { activityId } })),
    onSuccess: store,
  });
}

export function useUpdateReview(reviewId: string) {
  const store = useStoreReview();
  return useMutation({
    mutationFn: (body: ReviewUpdate) =>
      call(
        api.PATCH('/api/v1/post-investment-reviews/{reviewId}', {
          params: { path: { reviewId } },
          body,
        }),
      ),
    onSuccess: store,
  });
}

export function useSubmitReview(reviewId: string) {
  const store = useStoreReview();
  return useMutation({
    mutationFn: (version: number) =>
      call(
        api.POST('/api/v1/post-investment-reviews/{reviewId}/submit', {
          params: { path: { reviewId } },
          body: { version },
        }),
      ),
    onSuccess: store,
  });
}

export function useDeleteReview() {
  return useMutation({
    mutationFn: (reviewId: string) =>
      call(
        api.DELETE('/api/v1/post-investment-reviews/{reviewId}', {
          params: { path: { reviewId } },
        }),
      ),
  });
}

export function downloadReview(reviewId: string): Promise<string> {
  return downloadFromApi(
    api.GET('/api/v1/post-investment-reviews/{reviewId}/export', {
      params: { path: { reviewId } },
      parseAs: 'blob',
    }),
  );
}

export function downloadReviews(activityId?: string): Promise<string> {
  return downloadFromApi(
    api.GET('/api/v1/post-investment-reviews/export', {
      params: { query: listQuery(activityId) },
      parseAs: 'blob',
    }),
  );
}
