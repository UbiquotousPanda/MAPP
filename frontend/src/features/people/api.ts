/**
 * People and teams from the API (feature 003 plan, "Data hooks"): the lists every person and team
 * field needs, one person or team, and every change with its invalidation.
 *
 * Every change, when it is done (also when it failed), refreshes the people, the teams, the
 * session (the signed-in person's teams and name) and the history lists, so a membership change
 * shows on both sides at once (FR-012). Impact checks change nothing and refresh nothing.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { SESSION_KEY } from '@/session/useSession';
import type { CurrentUser, PreferencesUpdate } from '@/session/useSession';

export type Person = components['schemas']['Person'];
export type PersonDetails = components['schemas']['PersonDetails'];
export type PersonCreate = components['schemas']['PersonCreate'];
export type PersonUpdate = components['schemas']['PersonUpdate'];
export type Team = components['schemas']['Team'];
export type TeamCreate = components['schemas']['TeamCreate'];
export type TeamUpdate = components['schemas']['TeamUpdate'];
export type TeamColour = components['schemas']['TeamColour'];
export type PersonRef = components['schemas']['PersonRef'];
export type TeamRef = components['schemas']['TeamRef'];
export type UsageCount = components['schemas']['UsageCount'];
export type ImpactWarning = components['schemas']['ImpactWarning'];
export type ProfileUpdate = components['schemas']['ProfileUpdate'];
export type DisplayCurrencyOption = components['schemas']['DisplayCurrencyOption'];

export const PEOPLE_KEY = ['people'] as const;
export const TEAMS_KEY = ['teams'] as const;
export const DISPLAY_CURRENCIES_KEY = ['display-currencies'] as const;

const CHANGED_BY_EVERY_CHANGE: QueryKey[] = [
  PEOPLE_KEY,
  TEAMS_KEY,
  SESSION_KEY,
  ['activity-log'],
  ['recycle-bin'],
];

export function usePeople() {
  return useQuery({
    queryKey: PEOPLE_KEY,
    queryFn: () => call(api.GET('/api/v1/people')),
  });
}

export function useTeams() {
  return useQuery({
    queryKey: TEAMS_KEY,
    queryFn: () => call(api.GET('/api/v1/teams')),
  });
}

export function usePerson(id: string) {
  return useQuery({ queryKey: [...PEOPLE_KEY, id], queryFn: () => fetchPerson(id) });
}

export function useTeam(id: string) {
  return useQuery({ queryKey: [...TEAMS_KEY, id], queryFn: () => fetchTeam(id) });
}

export function fetchLatestPerson(
  queryClient: QueryClient,
  id: string,
): Promise<PersonDetails | undefined> {
  return queryClient
    .fetchQuery({ queryKey: [...PEOPLE_KEY, id], queryFn: () => fetchPerson(id), staleTime: 0 })
    .catch(() => undefined);
}

export function fetchLatestTeam(queryClient: QueryClient, id: string): Promise<Team | undefined> {
  return queryClient
    .fetchQuery({ queryKey: [...TEAMS_KEY, id], queryFn: () => fetchTeam(id), staleTime: 0 })
    .catch(() => undefined);
}

export function useCreatePerson() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (body: PersonCreate) => call(api.POST('/api/v1/people', { body })),
    onSettled: refresh,
  });
}

export interface PersonChange {
  id: string;
  body: PersonUpdate;
}

export function useUpdatePerson() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, body }: PersonChange) =>
      call(api.PATCH('/api/v1/people/{personId}', { params: { path: { personId: id } }, body })),
    onSettled: refresh,
  });
}

export function useCheckPersonImpact() {
  return useMutation({
    mutationFn: ({ id, body }: PersonChange) =>
      call(
        api.POST('/api/v1/people/{personId}/impact', { params: { path: { personId: id } }, body }),
      ),
  });
}

export interface StatusChange {
  id: string;
  active: boolean;
  version: number;
}

export function useSetPersonStatus() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, active, version }: StatusChange) =>
      call(
        api.POST('/api/v1/people/{personId}/status', {
          params: { path: { personId: id } },
          body: { active, version },
        }),
      ),
    onSettled: refresh,
  });
}

export function useCreateTeam() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (body: TeamCreate) => call(api.POST('/api/v1/teams', { body })),
    onSettled: refresh,
  });
}

export interface TeamChange {
  id: string;
  body: TeamUpdate;
}

export function useUpdateTeam() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, body }: TeamChange) =>
      call(api.PATCH('/api/v1/teams/{teamId}', { params: { path: { teamId: id } }, body })),
    onSettled: refresh,
  });
}

/** What saving the team's form would affect (FR-013); saves and refreshes nothing. */
export function useCheckTeamImpact() {
  return useMutation({
    mutationFn: ({ id, body }: TeamChange) =>
      call(api.POST('/api/v1/teams/{teamId}/impact', { params: { path: { teamId: id } }, body })),
  });
}

/** Sets a team inactive or reactivates it. */
export function useSetTeamStatus() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, active, version }: StatusChange) =>
      call(
        api.POST('/api/v1/teams/{teamId}/status', {
          params: { path: { teamId: id } },
          body: { active, version },
        }),
      ),
    onSettled: refresh,
  });
}

/** Moves an unused team, with its memberships, to the recycle bin; answers the entry for Undo. */
export function useDeleteTeam() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, version }: Seen) =>
      call(
        api.DELETE('/api/v1/teams/{teamId}', {
          params: { path: { teamId: id }, query: { version } },
        }),
      ),
    onSettled: refresh,
  });
}

export function useDisplayCurrencies() {
  return useQuery({
    queryKey: DISPLAY_CURRENCIES_KEY,
    queryFn: () => call(api.GET('/api/v1/me/display-currencies')),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (body: ProfileUpdate) => call(api.PATCH('/api/v1/me', { body })),
    onSuccess: (person) => queryClient.setQueryData<CurrentUser | null>(SESSION_KEY, person),
    onSettled: refresh,
  });
}

export function useUpdateDisplayPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PreferencesUpdate) => call(api.PATCH('/api/v1/me/preferences', { body })),
    onSuccess: (preferences) => {
      queryClient.setQueryData<CurrentUser | null>(SESSION_KEY, (user) =>
        user ? { ...user, preferences } : user,
      );
      return queryClient.invalidateQueries();
    },
  });
}

function fetchPerson(id: string) {
  return call(api.GET('/api/v1/people/{personId}', { params: { path: { personId: id } } }));
}

function fetchTeam(id: string) {
  return call(api.GET('/api/v1/teams/{teamId}', { params: { path: { teamId: id } } }));
}

function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      CHANGED_BY_EVERY_CHANGE.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}
