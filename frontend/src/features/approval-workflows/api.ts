/**
 * What Settings › Approval workflows asks the API (008 plan, "Server state"): the list, one
 * workflow's details, and every change. A workflow change shows on activities (their workflow
 * field, "(inactive)") and in counts of other features, so after every change — also a refused
 * one — every query but the session is asked again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { invalidateAllButSession } from '@/features/approvals';

export type ApprovalWorkflow = components['schemas']['ApprovalWorkflow'];
export type ApprovalWorkflowDetails = components['schemas']['ApprovalWorkflowDetails'];
export type WorkflowLevelInput = components['schemas']['ApprovalWorkflowLevelInput'];
export type WorkflowCreate = components['schemas']['ApprovalWorkflowCreate'];
export type WorkflowUpdate = components['schemas']['ApprovalWorkflowUpdate'];
export type ApprovalWorkflowLevel = components['schemas']['ApprovalWorkflowLevel'];
export type ApprovalCondition = components['schemas']['ApprovalCondition'];
export type ApprovalConditionInput = components['schemas']['ApprovalConditionInput'];
export type ApprovalRuleOptions = components['schemas']['ApprovalRuleOptions'];

export const WORKFLOWS_KEY = ['approval-workflows'];

export function useWorkflows() {
  return useQuery({
    queryKey: WORKFLOWS_KEY,
    queryFn: () => call(api.GET('/api/v1/approval-workflows')),
  });
}

export function useWorkflowDetails(workflowId: string) {
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, workflowId],
    queryFn: () => fetchDetails(workflowId),
  });
}

export function useRuleOptions(enabled = true) {
  return useQuery({
    queryKey: ['approval-rule-options'],
    queryFn: () => call(api.GET('/api/v1/approval-rule-options')),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export async function fetchLatestWorkflow(
  queryClient: QueryClient,
  workflowId: string,
): Promise<ApprovalWorkflow> {
  const details = await queryClient.fetchQuery({
    queryKey: [...WORKFLOWS_KEY, workflowId],
    queryFn: () => fetchDetails(workflowId),
    staleTime: 0,
  });
  return details.workflow;
}

export function useCreateWorkflow() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: WorkflowCreate) => call(api.POST('/api/v1/approval-workflows', { body })),
    onSettled: refresh,
  });
}

export function useUpdateWorkflow() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: WorkflowUpdate }) =>
      call(
        api.PATCH('/api/v1/approval-workflows/{workflowId}', {
          params: { path: { workflowId: id } },
          body: changes,
        }),
      ),
    onSettled: refresh,
  });
}

export function useSetWorkflowActive() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, active, version }: { id: string; active: boolean; version: number }) => {
      const request = { params: { path: { workflowId: id } }, body: { version } };
      return call(
        active
          ? api.POST('/api/v1/approval-workflows/{workflowId}/activate', request)
          : api.POST('/api/v1/approval-workflows/{workflowId}/deactivate', request),
      );
    },
    onSettled: refresh,
  });
}

export function useDeleteWorkflow() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, version }: Seen) =>
      call(
        api.DELETE('/api/v1/approval-workflows/{workflowId}', {
          params: { path: { workflowId: id }, query: { version } },
        }),
      ),
    onSettled: refresh,
  });
}

function fetchDetails(workflowId: string) {
  return call(
    api.GET('/api/v1/approval-workflows/{workflowId}', { params: { path: { workflowId } } }),
  );
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => invalidateAllButSession(queryClient);
}
