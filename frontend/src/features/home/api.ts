// One query per card, so a card that fails never hides the others.
import { useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';

export type HomeScope = components['schemas']['HomeScope'];
export type HomeSummary = components['schemas']['HomeSummary'];
export type HomePlanRow = components['schemas']['HomePlanRow'];
export type HomePlanPage = components['schemas']['HomePlanPage'];
export type HomeTeam = components['schemas']['HomeTeam'];
export type HomeAttentionItem = components['schemas']['HomeAttentionItem'];
export type HomeAttentionReason = components['schemas']['HomeAttentionReason'];
export type HomeAttentionPage = components['schemas']['HomeAttentionPage'];
export type WaitingItem = components['schemas']['WaitingItem'];
export type WaitingPage = components['schemas']['WaitingPage'];
export type MyActivityRow = components['schemas']['MyActivityRow'];
export type MyActivityGroup = components['schemas']['MyActivityGroup'];
export type MyActivitiesPage = components['schemas']['MyActivitiesPage'];
export type ActivityLogEntry = components['schemas']['ActivityLogEntry'];
export type RecentChangesPage = components['schemas']['RecentChangesPage'];
export type Money = components['schemas']['Money'];
export type FinancialOverview = components['schemas']['FinancialOverview'];

export const HOME_KEY = ['home'] as const;

export const HOME_KEYS = {
  summary: (scope: HomeScope) => [...HOME_KEY, 'summary', scope] as const,
  plans: (scope: HomeScope) => [...HOME_KEY, 'plans', scope] as const,
  attention: [...HOME_KEY, 'attention'] as const,
  waiting: [...HOME_KEY, 'waiting'] as const,
  myActivities: [...HOME_KEY, 'my-activities'] as const,
  recentChanges: (scope: HomeScope) => [...HOME_KEY, 'recent-changes', scope] as const,
};

/** Current figures each time Home is opened or returned to. */
const ALWAYS_FRESH = { staleTime: 0, refetchOnMount: 'always' } as const;

export function useHomeSummary(scope: HomeScope) {
  return useQuery({
    queryKey: HOME_KEYS.summary(scope),
    queryFn: () => call(api.GET('/api/v1/home/summary', { params: { query: { scope } } })),
    ...ALWAYS_FRESH,
  });
}

export function useHomePlans(scope: HomeScope) {
  return useQuery({
    queryKey: HOME_KEYS.plans(scope),
    queryFn: () => call(api.GET('/api/v1/home/plans', { params: { query: { scope } } })),
    ...ALWAYS_FRESH,
  });
}

export function useHomeAttention() {
  return useQuery({
    queryKey: HOME_KEYS.attention,
    queryFn: () => call(api.GET('/api/v1/home/attention')),
    ...ALWAYS_FRESH,
  });
}

export function useHomeWaiting() {
  return useQuery({
    queryKey: HOME_KEYS.waiting,
    queryFn: () => call(api.GET('/api/v1/home/waiting')),
    ...ALWAYS_FRESH,
  });
}

export function useHomeMyActivities() {
  return useQuery({
    queryKey: HOME_KEYS.myActivities,
    queryFn: () => call(api.GET('/api/v1/home/my-activities')),
    ...ALWAYS_FRESH,
  });
}

export function useHomeRecentChanges(scope: HomeScope) {
  return useQuery({
    queryKey: HOME_KEYS.recentChanges(scope),
    queryFn: () => call(api.GET('/api/v1/home/recent-changes', { params: { query: { scope } } })),
    ...ALWAYS_FRESH,
  });
}

/** Its key starts with 'financials', so a GSAP import or a link made on the Financials page asks it again. */
export function useFinancialOverview(scope: HomeScope, currency: string) {
  return useQuery({
    queryKey: ['financials', 'overview', scope, currency] as const,
    queryFn: () => call(api.GET('/api/v1/financials/overview', { params: { query: { scope } } })),
    ...ALWAYS_FRESH,
  });
}
