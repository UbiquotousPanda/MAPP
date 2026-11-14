import type { Permission } from '@/session/access';
import type { CurrentUser } from '@/session/useSession';

/** Every permission in all markets: what a test sees unless it gives the person their own access. */
const ALL_KEYS: Record<Permission, true> = {
  'plans.view': true,
  'plans.create': true,
  'plans.edit': true,
  'plans.publish': true,
  'plans.delete': true,
  'campaigns.edit': true,
  'campaigns.delete': true,
  'activities.edit': true,
  'activities.delete': true,
  'activities.submit': true,
  'data.export': true,
  'reports.view': true,
  'finance.view': true,
  'finance.link': true,
  'finance.import': true,
  'performance.import': true,
  'performance.link': true,
  'purchaseRequests.edit': true,
  'purchaseRequests.delete': true,
  'purchaseRequests.submit': true,
  'purchaseRequests.list': true,
  'approvals.decide': true,
  'approvals.decideOnBehalf': true,
  'globalBudgets.view': true,
  'globalBudgets.manage': true,
  'dashboards.view': true,
  'dashboards.build': true,
  'settings.manage': true,
  'exchangeRates.manage': true,
  'workflows.manage': true,
  'people.manage': true,
  'access.manage': true,
  'activityLog.viewAll': true,
  'recycleBin.purge': true,
};

const EVERYTHING: CurrentUser['access'] = {
  roles: [
    {
      id: 'RA-1002',
      role: { id: 'RL-1001', name: 'Administrator', builtIn: 'administrator' },
      scope: { type: 'all', teams: [], text: 'All markets' },
      scopeEmpty: false,
    },
  ],
  permissions: Object.keys(ALL_KEYS)
    .filter((key): key is Permission => key in ALL_KEYS)
    .map((key) => ({ key, all: true, teams: [] })),
  administrators: [],
  noSelfApproval: true,
};

/** Priya Raman with default preferences; pass only what a test needs to differ. */
export function testUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'U-1002',
    name: 'Priya Raman',
    firstName: 'Priya',
    email: 'priya.raman@shell.com',
    jobTitle: 'Marketer',
    initials: 'PR',
    version: 1,
    teams: [{ id: 'T-1001', name: 'Lubricants Europe', colour: 'blue', active: true }],
    preferences: {
      theme: 'system',
      sidebarCollapsed: false,
      displayCurrency: 'USD',
      dateFormat: 'DD MMM YYYY',
      pinnedPlanIds: [],
    },
    access: EVERYTHING,
    today: '2026-03-12',
    ...overrides,
  };
}
