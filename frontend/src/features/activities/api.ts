import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import { invalidateAllButSession } from '@/api/invalidate';
import type { components } from '@/api/generated/schema';

export type Activity = components['schemas']['Activity'];
export type ActivitySummary = components['schemas']['ActivitySummary'];
export type ActivityFormData = components['schemas']['ActivityForm'];
export type ActivityCreate = components['schemas']['ActivityCreate'];
export type ActivityUpdate = components['schemas']['ActivityUpdate'];
export type ActivitySubmitProblem = components['schemas']['ActivitySubmitProblem'];
export type ActivityTypeOption = components['schemas']['ActivityTypeOption'];
export type ActivityWorkflowOption = components['schemas']['ActivityWorkflowOption'];
export type Money = components['schemas']['Money'];
export type ActivityDestination = components['schemas']['ActivityDestination'];

export const activityKey = (id: string) => ['activity', id] as const;
export const newActivityFormKey = (initiativeId: string) =>
  ['activity-form', 'new', initiativeId] as const;
export const editActivityFormKey = (id: string) => ['activity-form', 'edit', id] as const;
export const planActivitiesKey = (planId: string) => ['plan-activities', planId] as const;
export const activityDestinationsKey = (id: string) => ['activity-destinations', id] as const;

export function useActivity(id: string) {
  return useQuery({
    queryKey: activityKey(id),
    queryFn: () =>
      call(api.GET('/api/v1/activities/{activityId}', { params: { path: { activityId: id } } })),
  });
}

/** Everything the new-activity form needs, with its defaults. Asked again each time the form opens, so the names in use and the Settings are current. */
export function useNewActivityForm(initiativeId: string) {
  return useQuery({
    queryKey: newActivityFormKey(initiativeId),
    queryFn: () =>
      call(
        api.GET('/api/v1/initiatives/{initiativeId}/activity-form', {
          params: { path: { initiativeId } },
        }),
      ),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** Everything the edit form needs (no defaults); asked again each time the form opens. */
export function useEditActivityForm(id: string) {
  return useQuery({
    queryKey: editActivityFormKey(id),
    queryFn: () =>
      call(
        api.GET('/api/v1/activities/{activityId}/form', { params: { path: { activityId: id } } }),
      ),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function usePlanActivities(planId: string) {
  return useQuery({
    queryKey: planActivitiesKey(planId),
    queryFn: () =>
      call(api.GET('/api/v1/plans/{planId}/activities', { params: { path: { planId } } })),
  });
}

/** Asks for the activity again and returns it as it is stored now. After a conflict, the edit form takes the latest version from it. */
export function fetchLatestActivity(queryClient: QueryClient, id: string): Promise<Activity> {
  // staleTime 0: always ask the API, never answer from the cache.
  return queryClient.fetchQuery({
    queryKey: activityKey(id),
    queryFn: () =>
      call(api.GET('/api/v1/activities/{activityId}', { params: { path: { activityId: id } } })),
    staleTime: 0,
  });
}

export interface NewActivity {
  initiativeId: string;
  body: ActivityCreate;
}

export function useCreateActivity() {
  const refresh = useRefreshPlanning();
  return useMutation({
    mutationFn: ({ initiativeId, body }: NewActivity) =>
      call(
        api.POST('/api/v1/initiatives/{initiativeId}/activities', {
          params: { path: { initiativeId } },
          body,
        }),
      ),
    onSettled: refresh,
  });
}

export interface EditedActivity {
  id: string;
  body: ActivityUpdate;
}

/** Saves an edited activity. The version comes from the edit form and never from the cache (001's edit-form rule), so a save after someone else's change is refused with a conflict. */
export function useUpdateActivity() {
  const refresh = useRefreshPlanning();
  return useMutation({
    mutationFn: ({ id, body }: EditedActivity) =>
      call(
        api.PATCH('/api/v1/activities/{activityId}', {
          params: { path: { activityId: id } },
          body,
        }),
      ),
    onSettled: refresh,
  });
}

/** Moves an activity and its line items to the recycle bin; answers the entry for Undo. The deleted activity itself is not asked again (its page is left), only the lists it was in. */
export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: Seen) =>
      call(
        api.DELETE('/api/v1/activities/{activityId}', {
          params: { path: { activityId: id }, query: { version } },
        }),
      ),
    onSettled: (_result, _error, { id }) => invalidateAllButSession(queryClient, id),
  });
}

/** The initiatives of the activity's plan, grouped by campaign, each with why the activity can't be moved or copied there. Never from an earlier opening: a move changes them. */
export function useActivityDestinations(id: string) {
  return useQuery({
    queryKey: activityDestinationsKey(id),
    queryFn: () =>
      call(
        api.GET('/api/v1/activities/{activityId}/destinations', {
          params: { path: { activityId: id } },
        }),
      ),
    staleTime: 0,
    gcTime: 0,
  });
}

export interface ActivityMove {
  id: string;
  initiativeId: string;
  version: number;
}

export function useMoveActivity() {
  const refresh = useRefreshPlanning();
  return useMutation({
    mutationFn: ({ id, initiativeId, version }: ActivityMove) =>
      call(
        api.POST('/api/v1/activities/{activityId}/move', {
          params: { path: { activityId: id } },
          body: { initiativeId, version },
        }),
      ),
    onSettled: refresh,
  });
}

export function useCopyActivity() {
  const refresh = useRefreshPlanning();
  return useMutation({
    mutationFn: ({ id, initiativeId }: { id: string; initiativeId: string }) =>
      call(
        api.POST('/api/v1/activities/{activityId}/copy', {
          params: { path: { activityId: id } },
          body: { initiativeId },
        }),
      ),
    onSettled: refresh,
  });
}

/** Refreshes everything an activity change can show in. A change waits for this before it is done, so the next page already shows the new state. */
function useRefreshPlanning() {
  const queryClient = useQueryClient();
  return () => invalidateAllButSession(queryClient);
}
