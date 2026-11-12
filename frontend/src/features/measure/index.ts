// The Reports area (features 039–050): every report's page from the start, so no lane edits this file (D-369).
import type { ComponentType } from 'react';
import { PlanBudgetReport } from './plan-budget/PlanBudgetReport';
import { ApprovalsReport } from './approvals/ApprovalsReport';
import { PurchaseRequestsReport } from './purchase-requests/PurchaseRequestsReport';
import { PlanDetailsReport } from './plan-details/PlanDetailsReport';
import { GsapLinkReport } from './gsap-link/GsapLinkReport';
import { UserAccessReport } from './user-access/UserAccessReport';
import { SummaryReport } from './summary/SummaryReport';
import { RevenueReport } from './revenue/RevenueReport';
import { FunnelReport } from './funnel/FunnelReport';
import { PerformanceReport } from './performance/PerformanceReport';
import { PurchasingReport } from './purchasing/PurchasingReport';
import { PlanDataReport } from './plan-data/PlanDataReport';
import type { ReportKey } from './reports';

export { ReportsPage } from './ReportsPage';
export { REPORT_ROUTES, SECTION_ROUTES } from './reports';
export type { ReportKey } from './reports';
export { RankedList, ReportTable, ReportWidget } from './shared';
export type { RankedColumn, RankedData } from './shared';
export type { ReportTableData } from './shared';
export { useSummaryReport } from './summary/api';

// The old keys' pages stay reachable at their old addresses until the redirects replace them.
export const REPORT_PAGES: Record<ReportKey, ComponentType> = {
  performance: PerformanceReport,
  budget: PlanBudgetReport,
  purchasing: PurchasingReport,
  planData: PlanDataReport,
  planBudget: PlanBudgetReport,
  approvals: ApprovalsReport,
  purchaseRequests: PurchaseRequestsReport,
  planDetails: PlanDetailsReport,
  gsapLink: GsapLinkReport,
  userAccess: UserAccessReport,
  summary: SummaryReport,
  revenue: RevenueReport,
  funnel: FunnelReport,
};
