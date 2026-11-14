import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
// What the line-item screens ask the API; every change, failed or not, refreshes what it shows in.
import { api, call } from '@/api/client';
import { useDebounced } from '@/ui/useDebounced';
import { invalidateAllButSession } from '@/api/invalidate';
import type { components } from '@/api/generated/schema';

export type LineItem = components['schemas']['LineItem'];
export type LineItemSection = components['schemas']['LineItemSection'];
export type LineItemDetails = components['schemas']['LineItemDetails'];
export type LineItemFormOptions = components['schemas']['LineItemFormOptions'];
export type LineItemActivity = components['schemas']['LineItemActivity'];
export type LineItemCreate = components['schemas']['LineItemCreate'];
export type LineItemUpdate = components['schemas']['LineItemUpdate'];
export type UnassignedBalance = components['schemas']['UnassignedBalance'];
export type LineItemCurrency = components['schemas']['LineItemCurrency'];
export type FinanceBudgetItemRef = components['schemas']['FinanceBudgetItemRef'];
export type Money = components['schemas']['Money'];
export type LineItemPreview = components['schemas']['LineItemPreview'];
export type LineItemPreviewInput = components['schemas']['LineItemPreviewInput'];

const PREVIEW_DELAY_MS = 250;

/** What saving the form would give, worked out by the API once the typing settles (D-061). */
export function useLineItemPreview(activityId: string, input: LineItemPreviewInput) {
  const settled = useDebounced(input, PREVIEW_DELAY_MS);
  return useQuery({
    queryKey: ['line-items', 'preview', activityId, settled],
    queryFn: () =>
      call(
        api.POST('/api/v1/activities/{activityId}/line-items/preview', {
          params: { path: { activityId } },
          body: settled,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useLineItemSection(activityId: string, enabled = true) {
  return useQuery({
    queryKey: ['line-items', 'activity', activityId],
    queryFn: () =>
      call(
        api.GET('/api/v1/activities/{activityId}/line-items', { params: { path: { activityId } } }),
      ),
    enabled,
  });
}

export function useLineItemFormOptions(activityId: string, enabled = true) {
  return useQuery({
    queryKey: ['line-items', 'form-options', activityId],
    queryFn: () =>
      call(
        api.GET('/api/v1/activities/{activityId}/line-items/form-options', {
          params: { path: { activityId } },
        }),
      ),
    enabled,
    // The balance and the default name change with every line item: always ask again.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useLineItem(lineItemId: string) {
  return useQuery({
    queryKey: ['line-items', 'item', lineItemId],
    queryFn: () =>
      call(api.GET('/api/v1/line-items/{lineItemId}', { params: { path: { lineItemId } } })),
  });
}

export function useCreateLineItem(activityId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: LineItemCreate) =>
      call(
        api.POST('/api/v1/activities/{activityId}/line-items', {
          params: { path: { activityId } },
          body,
        }),
      ),
    onSettled: () => refresh(),
  });
}

/** Saves the whole form of a line item with the version it started from (D-153). */
export function useUpdateLineItem(lineItemId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: LineItemUpdate) =>
      call(
        api.PATCH('/api/v1/line-items/{lineItemId}', { params: { path: { lineItemId } }, body }),
      ),
    onSettled: () => refresh(),
  });
}

export function useDuplicateLineItem() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (lineItemId: string) =>
      call(
        api.POST('/api/v1/line-items/{lineItemId}/duplicate', {
          params: { path: { lineItemId } },
          body: {},
        }),
      ),
    onSettled: () => refresh(),
  });
}

export function useDeleteLineItem() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id: lineItemId, version }: Seen) =>
      call(
        api.DELETE('/api/v1/line-items/{lineItemId}', {
          params: { path: { lineItemId }, query: { version } },
        }),
      ),
    // The deleted line item's own queries are left out: asked again they answer 404.
    onSuccess: (_result, { id }) => {
      void refresh(id);
    },
    onError: () => {
      void refresh();
    },
  });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return (deletedId?: string) => invalidateAllButSession(queryClient, deletedId);
}

/** Reads a line item again, bypassing the cache: the version to save over after a conflict. */
export function useFetchLatestLineItem() {
  const queryClient = useQueryClient();
  return (lineItemId: string) =>
    queryClient.fetchQuery({
      queryKey: ['line-items', 'item', lineItemId],
      queryFn: () =>
        call(api.GET('/api/v1/line-items/{lineItemId}', { params: { path: { lineItemId } } })),
      staleTime: 0,
    });
}
