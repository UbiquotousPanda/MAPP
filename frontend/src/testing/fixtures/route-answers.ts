import type { HttpHandler } from 'msw';
import { reply } from '../replies';
import { launchFilm, launchFilmRow, PEOPLE as ACTIVITY_PEOPLE } from './activities';
import { activityAttributeForm, editForm, newForm } from './activity-forms';
import { HISTORY_ANSWERS, logPage, logSummary } from './activity-log';
import { CATEGORIES } from './activity-categories';
import { TYPES } from './activity-types';
import { gridResult, PAGE_ANSWERS as ALL_WORK_PAGE } from './all-work';
import { detailsOf } from './approval-workflows';
import { approvalOf, NO_DELEGATIONS } from './approvals';
import { campaignForm } from './attribute-forms';
import {
  campaign,
  initiative,
  PEOPLE as CAMPAIGN_PEOPLE,
  planAnswer,
  planCampaigns,
} from './campaigns';
import { transactionOf } from './financial-transactions';
import { FT_1003, transactionPage as financialsPage } from './financials';
import { HOME_ANSWERS } from './home';
import {
  activityRecord,
  lineItemRecord,
  transaction,
  transactionPage,
} from './line-item-financials';
import { currentRates, formAnswers, formOptions } from './line-item-forms';
import { details, launchFilmSection } from './line-items';
import { performanceSource } from './performance';
import { NOTHING_INSIDE } from './plan-page';
import { financialsNotServed, FORM_ANSWERS, plan, planDefaults, seedList } from './plans';
import { activitySection, lineItemSection } from './purchase-requests';
import { BUSINESS_UNIT, FORM_ANSWERS as ATTRIBUTE_FORMS, page } from './shell-attributes';
import { runsPage } from './swbs-runs';

const NO_ROWS = { body: { items: [], total: 0 } };
const one = <T>(item: T) => ({ body: { items: [item], total: 1 } });

export { HOME_ANSWERS };

export const ACTIVITY_LOG: HttpHandler[] = [
  reply('GET /api/v1/activity-log/summary', { body: logSummary() }),
  reply('GET /api/v1/activity-log', { body: logPage([]) }),
];

export const RECYCLE_BIN: HttpHandler[] = [reply('GET /api/v1/recycle-bin', NO_ROWS)];

export const ALL_WORK: HttpHandler[] = [
  ...ALL_WORK_PAGE,
  reply('GET /api/v1/all-work', { body: gridResult() }),
];

export const SETTINGS: HttpHandler[] = [
  reply('GET /api/v1/settings/overview', {
    body: { models: 0, activityTypes: 0, shellAttributes: 0, currencies: 1, financeBudgetItems: 0 },
  }),
  reply('GET /api/v1/models', NO_ROWS),
  reply('GET /api/v1/activity-types', NO_ROWS),
  reply('GET /api/v1/settings/activity-categories', NO_ROWS),
  reply('GET /api/v1/currencies', NO_ROWS),
  reply('GET /api/v1/finance-budgets', {
    body: { items: [], total: 0, year: 2026, years: [2026] },
  }),
  reply('GET /api/v1/people', NO_ROWS),
  reply('GET /api/v1/teams', NO_ROWS),
  reply('GET /api/v1/approval-workflows', NO_ROWS),
  reply('GET /api/v1/roles', NO_ROWS),
  reply('GET /api/v1/field-help', { body: { items: [], total: 0, shellAttributesWithoutHelp: 0 } }),
  reply('GET /api/v1/exchange-rates/imports', NO_ROWS),
];

export const ACTIVITY_CATEGORIES: HttpHandler[] = [
  reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
  reply('GET /api/v1/activity-types', { body: TYPES }),
];

export const PERFORMANCE_DATA: HttpHandler[] = [
  reply('GET /api/v1/performance/sources', { body: { items: [performanceSource()] } }),
];

export const SHELL_ATTRIBUTES: HttpHandler[] = [
  reply('GET /api/v1/shell-attributes', { body: page([BUSINESS_UNIT]) }),
  reply(
    'GET /api/v1/shell-attributes/{attributeId}',
    { body: BUSINESS_UNIT },
    { attributeId: 'SA-1001' },
  ),
  reply(
    'GET /api/v1/shell-attributes/{attributeId}/options',
    { body: page([]) },
    { attributeId: 'SA-1001' },
  ),
  ...ATTRIBUTE_FORMS,
];

export const FINANCIALS: HttpHandler[] = [
  reply('GET /api/v1/financials/transactions', { body: financialsPage() }),
  reply('GET /api/v1/simulated-gsap/swbs-runs', { body: runsPage() }),
  reply(
    'GET /api/v1/financials/transactions/{transactionId}',
    { body: transactionOf(FT_1003) },
    { transactionId: 'FT-1003' },
  ),
];

export const APPROVALS: HttpHandler[] = [
  reply('GET /api/v1/approvals', NO_ROWS),
  reply('GET /api/v1/approval-delegations', NO_DELEGATIONS),
  reply('GET /api/v1/approval-workflows', NO_ROWS),
  reply(
    'GET /api/v1/approval-workflows/{workflowId}',
    { body: detailsOf() },
    { workflowId: 'WF-1001' },
  ),
];

export const PLANS: HttpHandler[] = [
  ...FORM_ANSWERS,
  ...HISTORY_ANSWERS,
  ...NOTHING_INSIDE,
  ...financialsNotServed('P-1001'),
  reply('GET /api/v1/plans', { body: seedList() }),
  reply('GET /api/v1/plan-defaults', { body: planDefaults() }),
  reply('GET /api/v1/plans/{planId}', { body: plan() }, { planId: 'P-1001' }),
];

export const CAMPAIGNS: HttpHandler[] = [
  ...HISTORY_ANSWERS,
  ...financialsNotServed('P-1001', 'C-1001', 'I-1001'),
  reply('GET /api/v1/plans/{planId}/campaigns', { body: planCampaigns() }, { planId: 'P-1001' }),
  reply('GET /api/v1/plans/{planId}', { body: planAnswer() }, { planId: 'P-1001' }),
  reply('GET /api/v1/campaigns/{campaignId}', { body: campaign() }, { campaignId: 'C-1001' }),
  reply(
    'GET /api/v1/initiatives/{initiativeId}',
    { body: initiative() },
    { initiativeId: 'I-1001' },
  ),
  reply(
    'GET /api/v1/shell-attribute-forms/{level}',
    { body: campaignForm() },
    { level: 'campaign' },
  ),
  reply(
    'GET /api/v1/shell-attribute-forms/{level}',
    { body: { ...campaignForm(), level: 'initiative' } },
    { level: 'initiative' },
  ),
  reply('GET /api/v1/people', { body: CAMPAIGN_PEOPLE }),
  reply('GET /api/v1/plans/{planId}/activities', one(launchFilmRow())),
];

export const ACTIVITIES: HttpHandler[] = [
  ...HISTORY_ANSWERS,
  reply(
    'GET /api/v1/initiatives/{initiativeId}/activity-form',
    { body: newForm() },
    { initiativeId: 'I-1001' },
  ),
  reply('GET /api/v1/people', { body: ACTIVITY_PEOPLE }),
  reply('GET /api/v1/activities/{activityId}', { body: launchFilm({ id: 'A-1001' }) }),
  reply('GET /api/v1/activities/{activityId}/form', { body: editForm() }),
  reply('GET /api/v1/activities/{activityId}/approval', {
    body: approvalOf({
      activityId: 'A-1001',
      status: 'created',
      displayStatus: 'created',
      rounds: [],
    }),
  }),
  reply(
    'GET /api/v1/shell-attribute-forms/{level}',
    { body: activityAttributeForm() },
    { level: 'activity' },
  ),
  reply('GET /api/v1/activities/{activityId}/line-items', { body: launchFilmSection() }),
  reply('GET /api/v1/exchange-rates/current', { body: currentRates() }),
  reply('GET /api/v1/financials/records/{recordId}', { body: activityRecord() }),
  reply('GET /api/v1/activities/{activityId}/purchase-requests', {
    body: activitySection({ activityId: 'A-1001', lineItems: [] }),
  }),
];

const LINE_ITEM_FORM: HttpHandler[] = [
  ...formAnswers(),
  reply('GET /api/v1/activities/{activityId}/line-items/form-options', { body: formOptions() }),
];

export const LINE_ITEMS: HttpHandler[] = [
  ...LINE_ITEM_FORM,
  ...HISTORY_ANSWERS,
  reply('GET /api/v1/line-items/{lineItemId}', { body: details() }),
  reply('GET /api/v1/financials/records/{recordId}', { body: lineItemRecord() }),
  reply('GET /api/v1/financials/transactions', { body: transactionPage([transaction()]) }),
  reply('GET /api/v1/line-items/{lineItemId}/purchase-requests', {
    body: lineItemSection({ lineItemId: 'L-1001', purchaseRequests: [] }),
  }),
];

const META = {
  version: 1,
  createdAt: '2026-03-01T09:00:00Z',
  createdBy: { id: 'U-1001', name: 'Alex Morgan' },
  updatedAt: '2026-03-01T09:00:00Z',
  updatedBy: { id: 'U-1001', name: 'Alex Morgan' },
};
const EUROPE = {
  id: 'T-1001',
  name: 'Lubricants Europe',
  description: '',
  colour: 'blue' as const,
  active: true,
  members: [],
  plans: [],
  ...META,
};
const PRIYA = {
  id: 'U-1002',
  name: 'Priya Raman',
  email: 'priya.raman@shell.com',
  jobTitle: 'Marketer',
  initials: 'PR',
  active: true,
  teams: [],
  ...META,
};

export const PEOPLE_AND_TEAMS: HttpHandler[] = [
  reply('GET /api/v1/teams', one(EUROPE)),
  reply('GET /api/v1/teams/{teamId}', { body: EUROPE }),
  reply('GET /api/v1/people', one(PRIYA)),
  reply('GET /api/v1/people/{personId}', { body: { ...PRIYA, usage: [] } }),
  reply('GET /api/v1/people/{personId}/roles', {
    status: 403,
    body: { error: { code: 'forbidden', message: 'No access', fields: [] } },
  }),
];

export const PROFILE: HttpHandler[] = [
  reply('GET /api/v1/me/display-currencies', {
    body: { items: [{ code: 'USD', name: 'US dollar', active: true }], total: 1 },
  }),
];
