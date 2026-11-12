// An approval action changes a status that queries of other features show, so after every action
// (also a refused one) every query but the session is asked again.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import { invalidateAllButSession } from '@/api/invalidate';
import type { components } from '@/api/generated/schema';
import { useMonthRange } from './useMonthRange';

export type ActivityApproval = components['schemas']['ActivityApproval'];
export type ApprovalSubmission = components['schemas']['ApprovalSubmission'];
export type ApprovalRound = components['schemas']['ApprovalRound'];
export type ApprovalRow = components['schemas']['ApprovalRow'];
export type ApprovalPreview = components['schemas']['ApprovalPreview'];
export type ApprovalPerson = components['schemas']['ApprovalPerson'];
export type ApprovalMonitoring = components['schemas']['ApprovalMonitoring'];
export type EscalationRunResult = components['schemas']['EscalationRunResult'];

export type ApprovalTab = 'waiting' | 'open' | 'decided';

/** Shared by an activity's Approval section and its status button. */
export function approvalKey(activityId: string) {
  return ['approval', activityId];
}

export { invalidateAllButSession };

export function useActivityApproval(activityId: string, enabled = true) {
  return useQuery({
    queryKey: approvalKey(activityId),
    queryFn: () =>
      call(
        api.GET('/api/v1/activities/{activityId}/approval', { params: { path: { activityId } } }),
      ),
    enabled,
  });
}

/** What Submit would do now; always asked afresh. */
export function fetchSubmission(
  queryClient: QueryClient,
  activityId: string,
): Promise<ApprovalSubmission> {
  return queryClient.fetchQuery({
    queryKey: ['approval-submission', activityId],
    queryFn: () =>
      call(
        api.GET('/api/v1/activities/{activityId}/approval/submission', {
          params: { path: { activityId } },
        }),
      ),
    staleTime: 0,
  });
}

/** `enabled` false waits while the page still picks its tab. */
export function useApprovalRows(tab: ApprovalTab, enabled = true) {
  return useQuery({
    queryKey: ['approvals', tab],
    queryFn: () => call(api.GET('/api/v1/approvals', { params: { query: { tab } } })),
    enabled,
  });
}

export function useApprovalPreview(activityId: string) {
  return useQuery({
    queryKey: ['approval-preview', activityId],
    queryFn: () =>
      call(
        api.GET('/api/v1/approvals/activities/{activityId}', { params: { path: { activityId } } }),
      ),
  });
}

export interface SubmitInput {
  activityId: string;
  version: number;
  comment: string;
}

export function useSubmitActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, version, comment }: SubmitInput) =>
      call(
        api.POST('/api/v1/activities/{activityId}/approval/submit', {
          params: { path: { activityId } },
          body: comment ? { version, comment } : { version },
        }),
      ),
    onSettled: () => invalidateAllButSession(queryClient),
  });
}

export interface DecisionInput {
  mode: 'approve' | 'decline';
  activityId: string;
  roundId: string;
  level: number;
  comment: string;
}

export function useDecide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, activityId, roundId, level, comment }: DecisionInput) => {
      const body = comment ? { roundId, level, comment } : { roundId, level };
      const params = { path: { activityId } };
      return call(
        mode === 'approve'
          ? api.POST('/api/v1/activities/{activityId}/approval/approve', { params, body })
          : api.POST('/api/v1/activities/{activityId}/approval/decline', { params, body }),
      );
    },
    onSettled: () => invalidateAllButSession(queryClient),
  });
}

export interface RecallInput {
  activityId: string;
  roundId: string;
  reason: string;
}

export function useRecall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, roundId, reason }: RecallInput) =>
      call(
        api.POST('/api/v1/activities/{activityId}/approval/recall', {
          params: { path: { activityId } },
          body: reason ? { roundId, reason } : { roundId },
        }),
      ),
    onSettled: () => invalidateAllButSession(queryClient),
  });
}

export function useApprovalMonitoring(enabled = true) {
  const { monthStart, monthEnd } = useMonthRange();
  return useQuery({
    queryKey: ['approval-monitoring', monthStart],
    queryFn: () =>
      call(
        api.GET('/api/v1/approvals/monitoring', { params: { query: { monthStart, monthEnd } } }),
      ),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useRunEscalations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => call(api.POST('/api/v1/approvals/escalations/run')),
    onSettled: () => invalidateAllButSession(queryClient),
  });
}
