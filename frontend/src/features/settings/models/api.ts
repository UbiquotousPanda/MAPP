// Every change refreshes the lists that show models (activity types list theirs) and the history lists.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { SETTINGS_KEYS } from '../api';

export type Model = components['schemas']['Model'];
export type ModelCreate = components['schemas']['ModelCreate'];
export type ModelUpdate = components['schemas']['ModelUpdate'];
export type ChangeImpact = components['schemas']['ChangeImpact'];

export const MODEL_LISTS: QueryKey[] = [
  SETTINGS_KEYS.models,
  SETTINGS_KEYS.activityTypes,
  SETTINGS_KEYS.overview,
  ['activity-log'],
  ['recycle-bin'],
];

export function fetchModel(id: string): Promise<Model> {
  return call(api.GET('/api/v1/models/{modelId}', { params: { path: { modelId: id } } }));
}

export function checkModelImpact(id: string, body: ModelUpdate): Promise<ChangeImpact> {
  return call(
    api.POST('/api/v1/models/{modelId}/impact', { params: { path: { modelId: id } }, body }),
  );
}

export function setModelStatus(id: string, body: { active: boolean; version: number }) {
  return call(
    api.POST('/api/v1/models/{modelId}/status', { params: { path: { modelId: id } }, body }),
  );
}

export function deleteModel({ id, version }: Seen) {
  return call(
    api.DELETE('/api/v1/models/{modelId}', {
      params: { path: { modelId: id }, query: { version } },
    }),
  );
}

export function useCreateModel() {
  const refresh = useRefreshModelLists();
  return useMutation({
    mutationFn: (body: ModelCreate) => call(api.POST('/api/v1/models', { body })),
    onSettled: refresh,
  });
}

export function useUpdateModel() {
  const refresh = useRefreshModelLists();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ModelUpdate }) =>
      call(api.PATCH('/api/v1/models/{modelId}', { params: { path: { modelId: id } }, body })),
    onSettled: refresh,
  });
}

export function useDeleteModel() {
  const refresh = useRefreshModelLists();
  return useMutation({ mutationFn: deleteModel, onSettled: refresh });
}

function useRefreshModelLists() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(MODEL_LISTS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
