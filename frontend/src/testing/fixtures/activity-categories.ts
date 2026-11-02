import { createElement } from 'react';
import type { HttpHandler } from 'msw';
import type { components } from '@/api/generated/schema';
import { ActivityCategoriesPage } from '@/features/settings/activity-categories/ActivityCategoriesPage';
import { mockApi } from '../mock-api';
import { renderWithProviders } from '../render';
import { reply } from '../replies';
import { EVENT, PODCAST, PRINT, TYPES } from './activity-types';
import { MADE, NOT_USED } from './settings';
import { testUser } from './users';

type ActivityCategory = components['schemas']['ActivityCategory'];

export const CATEGORIES_PATH = '/settings/activity-categories';

function ref(type: { id: string; name: string; active: boolean }) {
  return { id: type.id, name: type.name, active: type.active };
}

/** What the API says of a category that groups one type: never in use, as deleting it only releases the type. */
const GROUPS_ONE_TYPE: ActivityCategory['usage'] = {
  inUse: false,
  summary: 'Groups 1 activity type',
  parts: [{ kind: 'activityType', text: 'Groups 1 activity type', count: 1, inRecycleBin: 0 }],
  records: [],
};

export const ASSET: ActivityCategory = {
  id: 'CAT-1001',
  name: 'Asset',
  isDefault: true,
  activityTypes: [ref(EVENT)],
  active: true,
  usage: GROUPS_ONE_TYPE,
  version: 3,
  ...MADE,
};

export const PROMOTION: ActivityCategory = {
  ...ASSET,
  id: 'CAT-1002',
  name: 'Promotion',
  isDefault: false,
  activityTypes: [],
  usage: NOT_USED,
  version: 1,
};

/** Legacy: inactive, holding the inactive Print advert. */
export const LEGACY: ActivityCategory = {
  ...PROMOTION,
  id: 'CAT-1003',
  name: 'Legacy',
  activityTypes: [ref(PRINT)],
  usage: GROUPS_ONE_TYPE,
  active: false,
};

export const CATEGORIES = { items: [ASSET, PROMOTION, LEGACY], total: 3 };

export const UNCATEGORISED_TYPE = PODCAST;

export function renderActivityCategoriesPage(
  answers: HttpHandler[] = [],
  route: string = CATEGORIES_PATH,
) {
  const api = mockApi([
    reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
    reply('GET /api/v1/activity-types', { body: TYPES }),
    ...answers,
  ]);
  return {
    ...renderWithProviders(createElement(ActivityCategoriesPage), {
      route,
      user: testUser(),
      path: CATEGORIES_PATH,
    }),
    api,
  };
}
