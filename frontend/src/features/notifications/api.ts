// Polling and focus refetches show a new notification within a minute, without a push channel.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';

/** Named so because the browser already has a Notification type. */
export type AppNotification = components['schemas']['Notification'];
export type NotificationPage = components['schemas']['NotificationPage'];

export const NOTIFICATIONS_KEY = ['notifications'];

const POLL_MS = 30_000;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => call(api.GET('/api/v1/notifications')),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/** Shows it read at once, as the person is on their way to the activity; unread again if refused. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      call(
        api.POST('/api/v1/notifications/{notificationId}/read', {
          params: { path: { notificationId } },
        }),
      ),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const before = queryClient.getQueryData<NotificationPage>(NOTIFICATIONS_KEY);
      if (before) {
        queryClient.setQueryData(NOTIFICATIONS_KEY, withOneRead(before, notificationId));
      }
      return { before };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.before) {
        queryClient.setQueryData(NOTIFICATIONS_KEY, context.before);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => call(api.POST('/api/v1/notifications/read-all')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

function withOneRead(page: NotificationPage, notificationId: string): NotificationPage {
  return {
    ...page,
    items: page.items.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
  };
}
