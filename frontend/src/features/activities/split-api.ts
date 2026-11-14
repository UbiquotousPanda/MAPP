// The API works out every amount; the web app adds up the ticked line items only to pre-fill one.
import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, call } from '@/api/client';
import { invalidateAllButSession } from '@/api/invalidate';
import type { components } from '@/api/generated/schema';

export type ActivitySplitOptions = components['schemas']['ActivitySplitOptions'];
export type ActivitySplitRequest = components['schemas']['ActivitySplitRequest'];
export type ActivitySplitPreview = components['schemas']['ActivitySplitPreview'];
export type ActivitySplitSide = components['schemas']['ActivitySplitSide'];
export type ActivitySplitResult = components['schemas']['ActivitySplitResult'];
export type SplitLink = components['schemas']['SplitLink'];

export function useSplitOptions(activityId: string) {
  return useQuery({
    queryKey: ['activity', activityId, 'split-options'],
    queryFn: () =>
      call(
        api.GET('/api/v1/activities/{activityId}/split-options', {
          params: { path: { activityId } },
        }),
      ),
    // Each opening asks afresh: line items and their amounts may have changed.
    gcTime: 0,
  });
}

/** Both activities as the split would leave them; saves nothing. Null while nothing is chosen. */
export function useSplitPreview(activityId: string, request: ActivitySplitRequest | null) {
  return useQuery({
    queryKey: ['activity', activityId, 'split-preview', request],
    queryFn:
      request === null
        ? skipToken
        : () =>
            call(
              api.POST('/api/v1/activities/{activityId}/split-preview', {
                params: { path: { activityId } },
                body: request,
              }),
            ),
    placeholderData: keepPreviousData,
    gcTime: 0,
  });
}

export function useSplitActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ActivitySplitRequest }) =>
      call(
        api.POST('/api/v1/activities/{activityId}/split', {
          params: { path: { activityId: id } },
          body,
        }),
      ),
    onSettled: () => invalidateAllButSession(queryClient),
  });
}
