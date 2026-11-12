import type { components } from '@/api/generated/schema';

export type ReportKey = components['schemas']['ReportKey'];

export interface ReportRoute {
  key: ReportKey;
  path: string;
  name: string;
}

export interface ReportGroup {
  title: string;
  reports: ReportKey[];
}

/** The catalogue's five reports in its order: their address and page title. */
export const REPORT_ROUTES: ReportRoute[] = [
  { key: 'performance', path: 'performance', name: 'Performance' },
  { key: 'budget', path: 'budget', name: 'Budget and spend' },
  { key: 'purchasing', path: 'purchasing', name: 'Purchasing' },
  { key: 'approvals', path: 'approvals', name: 'Approval performance' },
  { key: 'planData', path: 'plan-data', name: 'Plan data and access' },
];

/** The old reports, now sections of the five; their pages keep their own title until each lane merges them. */
export const SECTION_ROUTES: ReportRoute[] = [
  { key: 'planBudget', path: 'plan-budget', name: 'Plan budget' },
  { key: 'purchaseRequests', path: 'purchase-requests', name: 'Purchase requests' },
  { key: 'planDetails', path: 'plan-details', name: 'Plan details' },
  { key: 'gsapLink', path: 'gsap-link', name: 'GSAP link' },
  { key: 'userAccess', path: 'user-access', name: 'User access' },
  { key: 'summary', path: 'summary', name: 'Summary' },
  { key: 'revenue', path: 'revenue', name: 'Revenue' },
  { key: 'funnel', path: 'funnel', name: 'Funnel stages' },
];

export function reportName(key: ReportKey): string {
  return [...REPORT_ROUTES, ...SECTION_ROUTES].find((r) => r.key === key)?.name ?? 'Report';
}

export const REPORT_GROUPS: ReportGroup[] = [
  { title: 'Performance', reports: ['performance'] },
  { title: 'Budget and spend', reports: ['budget', 'purchasing'] },
  { title: 'Process and governance', reports: ['approvals', 'planData'] },
];

/** Each report's ⓘ on the Reports page: the question it answers and who it is for. */
export const REPORT_ABOUT: Partial<Record<ReportKey, string>> = {
  performance:
    'Is the year on track, and what earned the revenue? For marketing leaders and activity owners.',
  budget: 'Are we on budget? For planners, team leaders and finance.',
  purchasing:
    'What have we committed, and has it reached a purchase order? For finance, procurement and planners.',
  approvals:
    'Where is work waiting for a decision? For team leaders and administrators. To decide on an approval, open the Approvals page.',
  planData: 'Is our plan data complete, and who has access? For administrators and data owners.',
};
