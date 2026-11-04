import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Funnel,
  Gauge,
  Link2,
  ListTree,
  ShoppingCart,
  TrendingUp,
  UserCog,
  Wallet,
} from 'lucide-react';
import type { ReportKey } from './reports';

export interface ReportGroup {
  title: string;
  reports: ReportKey[];
}

/** How the Reports page groups its cards, in the order they show; a group with no report the person may open is left out. */
export const REPORT_GROUPS: ReportGroup[] = [
  { title: 'Planning and budget', reports: ['planBudget', 'planDetails', 'approvals'] },
  { title: 'Purchasing and GSAP', reports: ['purchaseRequests', 'gsapLink'] },
  { title: 'Performance', reports: ['summary', 'revenue', 'funnel'] },
  { title: 'Administration', reports: ['userAccess'] },
];

export const REPORT_ICONS: Record<ReportKey, LucideIcon> = {
  planBudget: Wallet,
  planDetails: ListTree,
  approvals: BadgeCheck,
  purchaseRequests: ShoppingCart,
  gsapLink: Link2,
  summary: Gauge,
  revenue: TrendingUp,
  funnel: Funnel,
  userAccess: UserCog,
};
