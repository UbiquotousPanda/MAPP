// A change waits for refreshPlanning, so rows, panels, cards and totals change together.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';

export type Campaign = components['schemas']['Campaign'];
export type Initiative = components['schemas']['Initiative'];
export type PlanCampaigns = components['schemas']['PlanCampaigns'];
export type CampaignCreate = components['schemas']['CampaignCreate'];
export type CampaignUpdate = components['schemas']['CampaignUpdate'];
export type InitiativeCreate = components['schemas']['InitiativeCreate'];
export type InitiativeUpdate = components['schemas']['InitiativeUpdate'];
export type DeleteResult = components['schemas']['DeleteResult'];
export type Money = components['schemas']['Money'];
export type PersonRef = components['schemas']['PersonRef'];
export type Destination = components['schemas']['Destination'];
export type DestinationList = components['schemas']['DestinationList'];
export type MoveConsequences = components['schemas']['MoveConsequences'];

export type Purpose = 'move' | 'copy';

export const campaignKeys = {
  planCampaigns: (planId: string): QueryKey => ['plans', planId, 'campaigns'],
  campaign: (id: string): QueryKey => ['campaigns', id],
  initiative: (id: string): QueryKey => ['initiatives', id],
  /** Under the record's own key, so refreshPlanning asks for them again after a change. */
  destinations: (level: 'campaign' | 'initiative', id: string, purpose: Purpose): QueryKey => [
    level === 'campaign' ? 'campaigns' : 'initiatives',
    id,
    'destinations',
    purpose,
  ],
  plan: (planId: string): QueryKey => ['plan', planId],
};

// Everything a change to a campaign or initiative can show in; Undo refreshes the same.
export const PLANNING_KEYS: QueryKey[] = [
  ['plans'],
  ['plan'],
  ['campaigns'],
  ['initiatives'],
  ['plan-activities'],
  ['activity'],
  ['recycle-bin'],
  ['activity-log'],
];

export async function refreshPlanning(queryClient: QueryClient): Promise<void> {
  await Promise.all(PLANNING_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function usePlanCampaigns(planId: string) {
  return useQuery({
    queryKey: campaignKeys.planCampaigns(planId),
    queryFn: () =>
      call(api.GET('/api/v1/plans/{planId}/campaigns', { params: { path: { planId } } })),
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.campaign(campaignId),
    queryFn: () => fetchCampaign(campaignId),
  });
}

export function useInitiative(initiativeId: string) {
  return useQuery({
    queryKey: campaignKeys.initiative(initiativeId),
    queryFn: () => fetchInitiative(initiativeId),
  });
}

// The plan page's key: the forms need the plan's business unit, which decides the attributes shown.
export function usePlan(planId: string) {
  return useQuery({
    queryKey: campaignKeys.plan(planId),
    queryFn: () => call(api.GET('/api/v1/plans/{planId}', { params: { path: { planId } } })),
  });
}

// Never cached: after a conflict the form takes the version with the other person's change.
export function fetchLatestRecord(
  queryClient: QueryClient,
  level: 'campaign' | 'initiative',
  id: string,
): Promise<Campaign | Initiative> {
  return level === 'campaign'
    ? queryClient.fetchQuery({
        queryKey: campaignKeys.campaign(id),
        queryFn: () => fetchCampaign(id),
        staleTime: 0,
      })
    : queryClient.fetchQuery({
        queryKey: campaignKeys.initiative(id),
        queryFn: () => fetchInitiative(id),
        staleTime: 0,
      });
}

export function useCreateCampaign(planId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: CampaignCreate) =>
      call(api.POST('/api/v1/plans/{planId}/campaigns', { params: { path: { planId } }, body })),
    onSettled: refresh,
  });
}

export function useCreateInitiative(campaignId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: InitiativeCreate) =>
      call(
        api.POST('/api/v1/campaigns/{campaignId}/initiatives', {
          params: { path: { campaignId } },
          body,
        }),
      ),
    onSettled: refresh,
  });
}

export type RecordUpdate = CampaignUpdate & InitiativeUpdate;

export function useUpdateRecord(level: 'campaign' | 'initiative', id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: RecordUpdate): Promise<Campaign | Initiative> =>
      level === 'campaign'
        ? call(
            api.PATCH('/api/v1/campaigns/{campaignId}', {
              params: { path: { campaignId: id } },
              body,
            }),
          )
        : call(
            api.PATCH('/api/v1/initiatives/{initiativeId}', {
              params: { path: { initiativeId: id } },
              body,
            }),
          ),
    onSettled: refresh,
  });
}

export interface DeleteTarget {
  level: 'campaign' | 'initiative';
  id: string;
  version: number;
}

// The caller refreshes once its panel has closed, so a panel never shows its own record as gone.
export function useDeleteRecord() {
  return useMutation({
    mutationFn: ({ level, id, version }: DeleteTarget) =>
      level === 'campaign'
        ? call(
            api.DELETE('/api/v1/campaigns/{campaignId}', {
              params: { path: { campaignId: id }, query: { version } },
            }),
          )
        : call(
            api.DELETE('/api/v1/initiatives/{initiativeId}', {
              params: { path: { initiativeId: id }, query: { version } },
            }),
          ),
  });
}

// Never from an earlier opening of the dialog: what is available changes with every move.
export function useDestinations(level: 'campaign' | 'initiative', id: string, purpose: Purpose) {
  return useQuery({
    queryKey: campaignKeys.destinations(level, id, purpose),
    queryFn: () =>
      level === 'campaign'
        ? call(
            api.GET('/api/v1/campaigns/{campaignId}/destinations', {
              params: { path: { campaignId: id }, query: { purpose } },
            }),
          )
        : call(
            api.GET('/api/v1/initiatives/{initiativeId}/destinations', {
              params: { path: { initiativeId: id }, query: { purpose } },
            }),
          ),
    staleTime: 0,
    gcTime: 0,
  });
}

export interface DestinationTarget {
  level: 'campaign' | 'initiative';
  id: string;
  destinationId: string;
}

export function useMoveRecord() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({
      level,
      id,
      destinationId,
      version,
    }: DestinationTarget & { version: number }): Promise<Campaign | Initiative> =>
      level === 'campaign'
        ? call(
            api.POST('/api/v1/campaigns/{campaignId}/move', {
              params: { path: { campaignId: id } },
              body: { planId: destinationId, version },
            }),
          )
        : call(
            api.POST('/api/v1/initiatives/{initiativeId}/move', {
              params: { path: { initiativeId: id } },
              body: { campaignId: destinationId, version },
            }),
          ),
    onSettled: refresh,
  });
}

export function useCopyRecord() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({
      level,
      id,
      destinationId,
      name,
    }: DestinationTarget & { name: string }): Promise<Campaign | Initiative> =>
      level === 'campaign'
        ? call(
            api.POST('/api/v1/campaigns/{campaignId}/copy', {
              params: { path: { campaignId: id } },
              body: { planId: destinationId, name },
            }),
          )
        : call(
            api.POST('/api/v1/initiatives/{initiativeId}/copy', {
              params: { path: { initiativeId: id } },
              body: { campaignId: destinationId, name },
            }),
          ),
    onSettled: refresh,
  });
}

function fetchCampaign(campaignId: string) {
  return call(api.GET('/api/v1/campaigns/{campaignId}', { params: { path: { campaignId } } }));
}

function fetchInitiative(initiativeId: string) {
  return call(
    api.GET('/api/v1/initiatives/{initiativeId}', { params: { path: { initiativeId } } }),
  );
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => refreshPlanning(queryClient);
}
