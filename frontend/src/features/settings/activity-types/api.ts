// Every change refreshes the lists that show activity types, models included, and the history lists.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { SETTINGS_KEYS } from '../api';

export type ActivityType = components['schemas']['ActivityType'];
export type ActivityTypeCreate = components['schemas']['ActivityTypeCreate'];
export type ActivityTypeUpdate = components['schemas']['ActivityTypeUpdate'];
export type ChangeImpact = components['schemas']['ChangeImpact'];

export const ACTIVITY_TYPE_LISTS: QueryKey[] = [
  SETTINGS_KEYS.activityTypes,
  SETTINGS_KEYS.models,
  SETTINGS_KEYS.overview,
  ['activity-log'],
  ['recycle-bin'],
];

export function fetchActivityType(id: string): Promise<ActivityType> {
  return call(
    api.GET('/api/v1/activity-types/{activityTypeId}', {
      params: { path: { activityTypeId: id } },
    }),
  );
}

export function checkActivityTypeImpact(
  id: string,
  body: ActivityTypeUpdate,
): Promise<ChangeImpact> {
  return call(
    api.POST('/api/v1/activity-types/{activityTypeId}/impact', {
      params: { path: { activityTypeId: id } },
      body,
    }),
  );
}

export function setActivityTypeStatus(id: string, body: { active: boolean; version: number }) {
  return call(
    api.POST('/api/v1/activity-types/{activityTypeId}/status', {
      params: { path: { activityTypeId: id } },
      body,
    }),
  );
}

export function useCreateActivityType() {
  const refresh = useRefreshActivityTypeLists();
  return useMutation({
    mutationFn: (body: ActivityTypeCreate) => call(api.POST('/api/v1/activity-types', { body })),
    onSettled: refresh,
  });
}

export function useUpdateActivityType() {
  const refresh = useRefreshActivityTypeLists();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ActivityTypeUpdate }) =>
      call(
        api.PATCH('/api/v1/activity-types/{activityTypeId}', {
          params: { path: { activityTypeId: id } },
          body,
        }),
      ),
    onSettled: refresh,
  });
}

export function useDeleteActivityType() {
  const refresh = useRefreshActivityTypeLists();
  return useMutation({
    mutationFn: ({ id, version }: Seen) =>
      call(
        api.DELETE('/api/v1/activity-types/{activityTypeId}', {
          params: { path: { activityTypeId: id }, query: { version } },
        }),
      ),
    onSettled: refresh,
  });
}

function useRefreshActivityTypeLists() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(ACTIVITY_TYPE_LISTS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
