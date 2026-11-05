// The action-items pop-up of Home: what it asks the API and where each item leads.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { purchaseRequestHref, recordHref } from '@/ui/record-links';

export type HomeActionItem = components['schemas']['HomeActionItem'];

export const ACTION_ITEMS_KEY = ['home', 'action-items'] as const;

export function useHomeActionItems() {
  return useQuery({
    queryKey: ACTION_ITEMS_KEY,
    queryFn: () => call(api.GET('/api/v1/home/action-items')),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useRemindLater() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => call(api.POST('/api/v1/home/action-items/remind-later')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACTION_ITEMS_KEY }),
  });
}

const REASONS: Record<HomeActionItem['kind'], string> = {
  approval: 'Waiting for your approval',
  purchaseRequestToFix: 'Declined: fix it and submit it again',
  swbsRequest: 'Ready to send for an SWBS code',
  activityIncomplete: 'Fields still needed before you can submit it',
};

export function actionReason(item: HomeActionItem): string {
  return REASONS[item.kind];
}

export function actionHref(item: HomeActionItem): string {
  const { type, id } = item.record;
  switch (item.kind) {
    case 'approval':
      return `${type === 'activity' ? activityHref(item) : purchaseRequestHref(id)}#approval`;
    case 'purchaseRequestToFix':
      return purchaseRequestHref(id);
    case 'swbsRequest':
      return recordHref('lineItem', id);
    case 'activityIncomplete':
      return activityHref(item);
  }
}

function activityHref(item: HomeActionItem): string {
  const planId = item.plan?.type === 'plan' ? item.plan.id : undefined;
  return recordHref('activity', item.record.id, planId);
}
