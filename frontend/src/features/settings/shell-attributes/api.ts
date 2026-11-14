// A change refreshes what it can affect even when refused: someone else may have changed the attribute.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { SETTINGS_KEYS } from '../api';
import { LEVELS } from './attribute-words';

export type ShellAttribute = components['schemas']['ShellAttribute'];
export type ShellAttributeList = components['schemas']['ShellAttributePage'];
export type ShellAttributeCreate = components['schemas']['ShellAttributeCreate'];
export type ShellAttributeUpdate = components['schemas']['ShellAttributeUpdate'];
export type ChangeImpact = components['schemas']['ChangeImpact'];
export type Usage = components['schemas']['Usage'];
export type DeleteResult = components['schemas']['DeleteResult'];
export type AttributeCheckRequest = components['schemas']['AttributeCheckRequest'];
export type AttributeCheckResult = components['schemas']['AttributeCheckResult'];

const ALL_ATTRIBUTES_KEY = ['shell-attributes', 'all'] as const;

const LISTS: QueryKey = ['shell-attributes'];
const ATTRIBUTE_PAGES: QueryKey = ['shell-attribute'];
const ELSEWHERE: QueryKey[] = [
  ['shell-attribute-options'],
  ['shell-attribute-form'],
  ['activity-log'],
  ['recycle-bin'],
  SETTINGS_KEYS.overview,
];

export const CHANGED_BY_ANY_CHANGE: QueryKey[] = [LISTS, ATTRIBUTE_PAGES, ...ELSEWHERE];

export function useAllShellAttributes() {
  return useQuery({
    queryKey: ALL_ATTRIBUTES_KEY,
    queryFn: () => call(api.GET('/api/v1/shell-attributes')),
  });
}

export function useShellAttribute(id: string) {
  return useQuery({
    queryKey: SETTINGS_KEYS.shellAttribute(id),
    queryFn: () => fetchAttribute(id),
  });
}

export function fetchAttribute(id: string) {
  return call(
    api.GET('/api/v1/shell-attributes/{attributeId}', { params: { path: { attributeId: id } } }),
  );
}

export function useCreateAttribute() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: ShellAttributeCreate) =>
      call(api.POST('/api/v1/shell-attributes', { body })),
    onSettled: () => refresh(),
  });
}

export interface AttributeChange {
  id: string;
  body: ShellAttributeUpdate;
}

export function useUpdateAttribute() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, body }: AttributeChange) =>
      call(
        api.PATCH('/api/v1/shell-attributes/{attributeId}', {
          params: { path: { attributeId: id } },
          body,
        }),
      ),
    onSettled: () => refresh(),
  });
}

export function checkAttributeImpact({ id, body }: AttributeChange): Promise<ChangeImpact> {
  return call(
    api.POST('/api/v1/shell-attributes/{attributeId}/impact', {
      params: { path: { attributeId: id } },
      body,
    }),
  );
}

export interface StatusChange {
  id: string;
  active: boolean;
  version: number;
}

export function useSetAttributeStatus() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, active, version }: StatusChange) =>
      call(
        api.POST('/api/v1/shell-attributes/{attributeId}/status', {
          params: { path: { attributeId: id } },
          body: { active, version },
        }),
      ),
    onSettled: () => refresh(),
  });
}

export interface AttributeMove {
  attribute: ShellAttribute;
  what: 'attribute' | 'section';
  direction: 'up' | 'down';
}

export function useMoveAttribute() {
  const queryClient = useQueryClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ attribute, what, direction }: AttributeMove) =>
      call(
        api.POST('/api/v1/shell-attributes/{attributeId}/move', {
          params: { path: { attributeId: attribute.id } },
          body: { what, direction, version: attribute.version },
        }),
      ),
    onSuccess: (levelList, { attribute }) => {
      queryClient.setQueryData<ShellAttributeList>(ALL_ATTRIBUTES_KEY, (all) =>
        all ? withLevelReplaced(all, attribute.level, levelList) : all,
      );
    },
    // After a move the list is already up to date; everything else is asked again.
    onSettled: (_data, error) => refresh(error ? undefined : [ATTRIBUTE_PAGES, ...ELSEWHERE]),
  });
}

export function useDeleteAttribute() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, version }: Seen) =>
      call(
        api.DELETE('/api/v1/shell-attributes/{attributeId}', {
          params: { path: { attributeId: id }, query: { version } },
        }),
      ),
    // Not the deleted attribute's own page: it would ask for an attribute that is gone.
    onSettled: () => refresh([LISTS, ...ELSEWHERE]),
  });
}

export function checkAttributeValues(
  level: ShellAttribute['level'],
  body: AttributeCheckRequest,
): Promise<AttributeCheckResult> {
  return call(
    api.POST('/api/v1/shell-attribute-forms/{level}/check', { params: { path: { level } }, body }),
  );
}

function withLevelReplaced(
  all: ShellAttributeList,
  level: ShellAttribute['level'],
  levelList: ShellAttributeList,
): ShellAttributeList {
  const items = LEVELS.flatMap((each) =>
    each === level ? levelList.items : all.items.filter((attribute) => attribute.level === each),
  );
  return { items, total: items.length };
}

export function useRefresh() {
  const queryClient = useQueryClient();
  return (keys: QueryKey[] = CHANGED_BY_ANY_CHANGE) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
