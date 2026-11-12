// Every change, done or refused, refreshes roles, access, the session (own access may change) and history.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { SESSION_KEY } from '@/session/useSession';

export type PermissionKey = components['schemas']['PermissionKey'];
export type PermissionInfo = components['schemas']['PermissionInfo'];
export type PermissionGroup = components['schemas']['PermissionGroup'];
export type PermissionCatalogue = components['schemas']['PermissionCatalogue'];
export type Role = components['schemas']['Role'];
export type RoleCreate = components['schemas']['RoleCreate'];
export type RoleUpdate = components['schemas']['RoleUpdate'];
export type RoleRef = components['schemas']['RoleRef'];
export type AccessScopeType = components['schemas']['AccessScopeType'];
export type AccessScopeInput = components['schemas']['AccessScopeInput'];
export type RoleAssignment = components['schemas']['RoleAssignment'];
export type RoleAssignmentInput = components['schemas']['RoleAssignmentInput'];
export type PersonRoles = components['schemas']['PersonRoles'];
export type PersonRolesUpdate = components['schemas']['PersonRolesUpdate'];
export type MyPermission = components['schemas']['MyPermission'];
export type MyAccess = components['schemas']['MyAccess'];
export type AccessRules = components['schemas']['AccessRules'];
export type AccessRulesUpdate = components['schemas']['AccessRulesUpdate'];
export type ImpactWarning = components['schemas']['ImpactWarning'];
export type ActivityLogEntry = components['schemas']['ActivityLogEntry'];

export const ROLES_KEY = ['roles'] as const;
export const PERMISSIONS_KEY = ['access', 'permissions'] as const;
export const PEOPLE_ACCESS_KEY = ['access', 'people'] as const;
export const ACCESS_CHANGES_KEY = ['access', 'changes'] as const;
export const ACCESS_RULES_KEY = ['access-rules'] as const;

export function personRolesKey(personId: string): QueryKey {
  return ['people', personId, 'roles'];
}

const CHANGED_BY_EVERY_CHANGE: QueryKey[] = [
  ROLES_KEY,
  ['access'],
  ACCESS_RULES_KEY,
  ['people'],
  SESSION_KEY,
  ['activity-log'],
  ['recycle-bin'],
];

export function usePermissionCatalogue() {
  return useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: () => call(api.GET('/api/v1/access/permissions')),
    // The catalogue is part of the code: it never changes while the app runs.
    staleTime: Infinity,
  });
}

export function useRoles() {
  return useQuery({ queryKey: ROLES_KEY, queryFn: () => call(api.GET('/api/v1/roles')) });
}

export function useRole(roleId: string) {
  return useQuery({
    queryKey: [...ROLES_KEY, roleId],
    queryFn: () => call(api.GET('/api/v1/roles/{roleId}', { params: { path: { roleId } } })),
    enabled: roleId !== '',
  });
}

export function usePeopleAccess() {
  return useQuery({
    queryKey: PEOPLE_ACCESS_KEY,
    queryFn: () => call(api.GET('/api/v1/access/people')),
  });
}

export function usePersonRoles(personId: string) {
  return useQuery({
    queryKey: personRolesKey(personId),
    queryFn: () =>
      call(api.GET('/api/v1/people/{personId}/roles', { params: { path: { personId } } })),
  });
}

export function useAccessRules() {
  return useQuery({
    queryKey: ACCESS_RULES_KEY,
    queryFn: () => call(api.GET('/api/v1/access-rules')),
  });
}

export function useAccessChanges() {
  return useQuery({
    queryKey: ACCESS_CHANGES_KEY,
    queryFn: () => call(api.GET('/api/v1/access/changes')),
  });
}

export function useCreateRole() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (body: RoleCreate) => call(api.POST('/api/v1/roles', { body })),
    onSettled: refresh,
  });
}

export function useUpdateRole() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: RoleUpdate }) =>
      call(api.PATCH('/api/v1/roles/{roleId}', { params: { path: { roleId } }, body })),
    onSettled: refresh,
  });
}

export function useDeleteRole() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id: roleId, version }: Seen) =>
      call(
        api.DELETE('/api/v1/roles/{roleId}', { params: { path: { roleId }, query: { version } } }),
      ),
    onSettled: refresh,
  });
}

export interface PersonRolesChange {
  personId: string;
  body: PersonRolesUpdate;
}

export function useSetPersonRoles() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ personId, body }: PersonRolesChange) =>
      call(api.PUT('/api/v1/people/{personId}/roles', { params: { path: { personId } }, body })),
    onSettled: refresh,
  });
}

export function useCheckPersonRolesImpact() {
  return useMutation({
    mutationFn: ({ personId, body }: PersonRolesChange) =>
      call(
        api.POST('/api/v1/people/{personId}/roles/impact', {
          params: { path: { personId } },
          body,
        }),
      ),
  });
}

export function useUpdateAccessRules() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (body: AccessRulesUpdate) => call(api.PATCH('/api/v1/access-rules', { body })),
    onSettled: refresh,
  });
}

function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      CHANGED_BY_EVERY_CHANGE.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}
