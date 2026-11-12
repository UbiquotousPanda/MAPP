import type { components } from '@/api/generated/schema';

export type ReportKey = components['schemas']['ReportKey'];

export interface ReportRoute {
  key: ReportKey;
  path: string;
  name: string;
  feature: string;
}

export interface ReportGroup {
  title: string;
  description: string;
  reports: ReportKey[];
}

/** The catalogue's reports in its order (039 data-model §3): their address, page title and owning feature. */
export const REPORT_ROUTES: ReportRoute[] = [
  { key: 'planBudget', path: 'plan-budget', name: 'Plan budget', feature: '040' },
  { key: 'approvals', path: 'approvals', name: 'Approval performance', feature: '041' },
  { key: 'purchaseRequests', path: 'purchase-requests', name: 'Purchase requests', feature: '042' },
  { key: 'planDetails', path: 'plan-details', name: 'Plan details', feature: '043' },
  { key: 'gsapLink', path: 'gsap-link', name: 'GSAP link', feature: '044' },
  { key: 'userAccess', path: 'user-access', name: 'User access', feature: '045' },
  { key: 'summary', path: 'summary', name: 'Summary', feature: '048' },
  { key: 'revenue', path: 'revenue', name: 'Revenue', feature: '049' },
  { key: 'funnel', path: 'funnel', name: 'Funnel stages', feature: '049' },
];

/** The Reports page's groups, in the order shown (039-C7). */
export const REPORT_GROUPS: ReportGroup[] = [
  {
    title: 'Performance',
    description: 'Whether marketing delivers results against its goals.',
    reports: ['summary', 'revenue', 'funnel'],
  },
  {
    title: 'Budget and spend',
    description: 'Where the money is planned, committed and paid.',
    reports: ['planBudget', 'purchaseRequests', 'gsapLink'],
  },
  {
    title: 'Process and governance',
    description: 'Whether work flows, plan data is complete and access is right.',
    reports: ['approvals', 'planDetails', 'userAccess'],
  },
];

/** Each report's ⓘ on the Reports page: the question it answers, what it shows and who it is for (039-C7). */
export const REPORT_ABOUT: Record<ReportKey, string> = {
  summary:
    'Is the year on track? Revenue projected against goal, the leading plans and segments, and the funnel from inquiries to qualified leads. For marketing leaders.',
  revenue:
    'Which activities earned the revenue, and did they pay back? Revenue against goal by month, the revenue credited to each plan, campaign or activity across the customer journey, and its return on cost. For marketing leaders and activity owners.',
  funnel:
    'Where does the funnel leak? One stage, inquiries or qualified leads, against goal by month, and how many move on from the stage before. For marketing leaders and campaign managers.',
  planBudget:
    'Are we on budget? Budget, planned cost, committed and actual spend by month, and the plans, campaigns or activities over or under. For planners, team leaders and finance.',
  purchaseRequests:
    'What have we committed, and to which vendor? Approved purchase requests by vendor, owner and delivery month, and how much has been invoiced. For finance, procurement and planners.',
  gsapLink:
    "Has everything sent to GSAP come back? Line items still waiting for their SWBS code, purchase requests GSAP hasn't answered, and each line item's purchase orders. For finance and operations.",
  approvals:
    'Where is work waiting for a decision? How many activities and purchase requests wait for approval, how long each approver takes, and every approval round. For team leaders and administrators. To decide on an approval, open the Approvals page.',
  planDetails:
    'Is our plan data complete and well tagged? How activities and planned cost spread across each Shell attribute, and which records leave one empty. For administrators and data owners.',
  userAccess:
    'Who can do what, and who uses SP&A One? Each person’s role and teams, and when they last signed in. For administrators.',
};
