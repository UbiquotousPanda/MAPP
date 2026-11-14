import { screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HttpHandler } from 'msw';
import { expectCurrentSection, renderApp } from '@/testing/app';
import * as answers from '@/testing/fixtures/route-answers';
import { VIEWER } from '@/testing/fixtures/viewer';
import { mockApi } from '@/testing/mock-api';
import { renderRoutes } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { nth } from '@/testing/dom';
import { reply } from '@/testing/replies';
import { ENVIRONMENT_LOCAL } from '@/testing/fixtures/environment';
import '@/testing/pages';
import { routes } from './routes';

const PRIYA = testUser();

function BrokenPage(): never {
  throw new Error('A programming mistake');
}

/** The app's root route — its layout and its error page — with one test page inside. */
function renderInRoot(page: ReactElement) {
  const root = nth(routes, 0);
  renderRoutes(
    [
      {
        path: '/',
        element: root.element,
        errorElement: root.errorElement,
        children: [{ index: true, element: page }],
      },
    ],
    { user: null },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('routes', () => {
  it('catches an error in any page and shows the error page, never a blank screen (FR-020)', () => {
    // React reports the thrown error on the console; the test only looks at the screen.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderInRoot(<BrokenPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it.each([
    ['/', 'Home'],
    ['/plans', 'Plans'],
    ['/approvals', 'Approvals'],
    ['/all-work', 'All work'],
    ['/budgets', 'Global budgets'],
    ['/budgets/GB-1001', 'Global budget'],
    ['/financials', 'Financials'],
    ['/financials/transactions/FT-1003', 'Financials'],
    ['/settings', 'Settings'],
    ['/recycle-bin', 'Recycle bin'],
    ['/activity-log', 'Activity log'],
    ['/profile', 'My profile'],
    ['/plans/P-1001/campaigns/C-1001', 'Plans'],
    ['/activities/A-1001/line-items/new', 'New line item'],
    ['/dev/sample-records', 'Sample records'],
    ['/dev/components', 'Shared building blocks'],
  ])(
    'names %s in the browser tab already while the session is checked (plan "Session")',
    async (path, title) => {
      mockApi([reply('GET /api/v1/me', () => new Promise<never>(() => {}))]);
      renderRoutes(routes, { route: path });

      await screen.findByRole('status');
      expect(document.title).toBe(`${title} · SP&A One`);
    },
  );

  it.each([
    ['/dev/sample-records', 'Sample records'],
    ['/dev/components', 'Shared building blocks'],
  ])(
    'opens the developer page %s in the app layout, outside the navigation, where demo sign-in is on (research R23)',
    async (path, title) => {
      mockApi([
        reply('GET /api/v1/me', { body: PRIYA }),
        reply('GET /api/v1/environment', { body: ENVIRONMENT_LOCAL }),
        reply('GET /api/v1/sample-folders', { body: { items: [], total: 0 } }),
        reply('GET /api/v1/recycle-bin', { body: { items: [], total: 0 } }),
        reply('GET /api/v1/activity-log', { body: { items: [], total: 0 } }),
      ]);
      renderRoutes(routes, { route: path });

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      const navigation = screen.getByRole('navigation', { name: 'Main' });
      expect(within(navigation).queryByRole('link', { name: title })).not.toBeInTheDocument();
      expect(document.title).toBe(`${title} · SP&A One`);
    },
  );

  it.each(['/dev/sample-records', '/dev/components'])(
    'shows "Page not found" at %s where demo sign-in is off (FR-009, D-036)',
    async (path) => {
      const api = mockApi([
        reply('GET /api/v1/me', { body: PRIYA }),
        reply('GET /api/v1/environment', {
          body: { ...ENVIRONMENT_LOCAL, environment: 'production', demoSignIn: false },
        }),
      ]);
      renderRoutes(routes, { route: path });

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
      // The developer route asked the API which environment this is.
      expect(api.requests.map((request) => request.path)).toContain('/api/v1/environment');
    },
  );
});

const P = '/plans/P-1001';
const PLAN = 'FY2026 Lubricants Europe';

/** path, the page heading (or panel name, for "panel"), tab title, current sidebar section, answers. */
type Row = [string, string, string, string | null, HttpHandler[]];

const PAGES: Row[] = [
  ['/', 'Welcome back, Priya.', 'Home', 'Home', answers.HOME_ANSWERS],
  ['/plans', 'Plans', 'Plans', 'Plans', answers.PLANS],
  ['/plans/new', 'New plan', 'New plan', 'Plans', answers.PLANS],
  [P, PLAN, PLAN, 'Plans', answers.PLANS],
  [`${P}/edit`, 'Edit plan', `Edit ${PLAN}`, 'Plans', answers.PLANS],
  [
    `${P}/initiatives/I-1001/activities/new`,
    'New activity',
    'New activity',
    'Plans',
    answers.ACTIVITIES,
  ],
  [`${P}/activities/A-1001`, 'Launch film', 'Launch film', 'Plans', answers.ACTIVITIES],
  [`${P}/activities/A-1001/edit`, 'Edit activity', 'Edit Launch film', 'Plans', answers.ACTIVITIES],
  [
    '/activities/A-1001/line-items/new',
    'New line item',
    'New line item',
    'Plans',
    answers.LINE_ITEMS,
  ],
  ['/line-items/L-1001', 'Agency fee', 'Agency fee', 'Plans', answers.LINE_ITEMS],
  ['/line-items/L-1001/edit', 'Edit line item', 'Edit Agency fee', 'Plans', answers.LINE_ITEMS],
  ['/approvals', 'Approvals', 'Approvals', 'Approvals', answers.APPROVALS],
  ['/all-work', 'All work', 'All work', 'All work', answers.ALL_WORK],
  ['/financials', 'Financials', 'Financials', 'Financials', answers.FINANCIALS],
  ['/activity-log', 'Activity log', 'Activity log', 'Activity log', answers.ACTIVITY_LOG],
  ['/recycle-bin', 'Recycle bin', 'Recycle bin', 'Recycle bin', answers.RECYCLE_BIN],
  ['/profile', 'My profile', 'My profile', null, answers.PROFILE],
  ['/settings', 'Settings', 'Settings', 'Settings', answers.SETTINGS],
  ['/settings/models', 'Models', 'Models', 'Settings', answers.SETTINGS],
  ['/settings/activity-types', 'Activity types', 'Activity types', 'Settings', answers.SETTINGS],
  ['/settings/currencies', 'Currencies', 'Currencies', 'Settings', answers.SETTINGS],
  [
    '/settings/finance-budget-items',
    'Finance budget items',
    'Finance budget items',
    'Settings',
    answers.SETTINGS,
  ],
  [
    '/settings/approval-workflows',
    'Approval workflows',
    'Approval workflows',
    'Settings',
    answers.APPROVALS,
  ],
  ['/settings/people', 'People', 'People', 'Settings', answers.PEOPLE_AND_TEAMS],
  ['/settings/teams', 'Teams', 'Teams', 'Settings', answers.PEOPLE_AND_TEAMS],
  [
    '/settings/shell-attributes',
    'Shell attributes',
    'Shell attributes',
    'Settings',
    answers.SHELL_ATTRIBUTES,
  ],
  [
    '/settings/shell-attributes/new',
    'New Shell attribute',
    'New Shell attribute',
    'Settings',
    answers.SHELL_ATTRIBUTES,
  ],
  [
    '/settings/shell-attributes/SA-1001',
    'Business unit',
    'Business unit · Shell attributes',
    'Settings',
    answers.SHELL_ATTRIBUTES,
  ],
  [
    '/settings/shell-attributes/SA-1001/edit',
    "Edit Shell attribute 'Business unit'",
    'Edit Business unit',
    'Settings',
    answers.SHELL_ATTRIBUTES,
  ],
  // 047: the Settings card once led to Not found.
  [
    '/settings/activity-categories',
    'Activity categories',
    'Activity categories',
    'Settings',
    answers.ACTIVITY_CATEGORIES,
  ],
  [
    '/settings/performance-data',
    'Performance data',
    'Performance data',
    'Settings',
    answers.PERFORMANCE_DATA,
  ],
];

/** Side panels open over their list or page; the page behind is hidden from screen readers. */
const PANELS: Row[] = [
  [
    '/financials/transactions/FT-1003',
    'PO 4500001003 / 10',
    'Financials',
    null,
    answers.FINANCIALS,
  ],
  [
    '/settings/approval-workflows/WF-1001',
    'Lubricants EU approval',
    'Approval workflows',
    null,
    answers.APPROVALS,
  ],
  ['/settings/people/U-1002', 'Priya Raman', 'People', null, answers.PEOPLE_AND_TEAMS],
  ['/settings/teams/T-1001', 'Lubricants Europe', 'Teams', null, answers.PEOPLE_AND_TEAMS],
  [`${P}/campaigns/new`, 'New campaign', 'New campaign', PLAN, answers.CAMPAIGNS],
  [`${P}/campaigns/C-1001`, 'Helix launch', 'Helix launch', PLAN, answers.CAMPAIGNS],
  [`${P}/campaigns/C-1001/edit`, 'Edit campaign', 'Helix launch', PLAN, answers.CAMPAIGNS],
  [
    `${P}/campaigns/C-1001/initiatives/new`,
    'New initiative',
    'New initiative',
    PLAN,
    answers.CAMPAIGNS,
  ],
  [`${P}/initiatives/I-1001`, 'Digital & social', 'Digital & social', PLAN, answers.CAMPAIGNS],
  [`${P}/initiatives/I-1001/edit`, 'Edit initiative', 'Digital & social', PLAN, answers.CAMPAIGNS],
];

describe('every address opens its page (001 US2 scenario 1, SC-003; 002–011, 015, 046, 047)', () => {
  it.each(PAGES)('%s: "%s", tab "%s", %s current', async (path, heading, tab, section, api) => {
    renderApp(path, api);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(`${tab} · SP&A One`));
    if (section) {
      expectCurrentSection(section);
    }
  });

  it.each(PANELS)('%s: the "%s" panel, tab "%s"', async (path, panel, tab, behind, api) => {
    renderApp(path, api);

    expect(await screen.findByRole('dialog', { name: panel })).toBeInTheDocument();
    if (behind) {
      expect(
        await screen.findByRole('heading', { level: 1, name: behind, hidden: true }),
      ).toBeInTheDocument();
    }
    await waitFor(() => expect(document.title).toBe(`${tab} · SP&A One`));
  });

  it('opens the short address /activities/:activityId under its plan, keeping the #part (D-194)', async () => {
    const { router } = renderApp('/activities/A-1001#line-items', answers.ACTIVITIES);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Launch film' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/plans/P-1001/activities/A-1001');
    expect(router.state.location.hash).toBe('#line-items');
  });

  it('046 FR-043 Imports and Rows to review show No access to someone without performance.import', async () => {
    renderApp('/settings/performance-data/review', [], VIEWER);

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeVisible();
  });
});
