import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CurrentUser } from '@/session/useSession';
import { expectNoAxeViolations } from '@/testing/axe';
import { TEAMS } from '@/testing/fixtures/plans';
import { reportFrame } from '@/testing/fixtures/reports';
import { testUser } from '@/testing/fixtures/users';
import { VIEWER } from '@/testing/fixtures/viewer';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { planDetails } from '../plan-details/plan-details-fixture';
import { userAccessReport } from '../user-access/user-access-fixture';
import { PlanDataReport } from './PlanDataReport';

function renderPage(route = '/reports/plan-data', user: CurrentUser = testUser()) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: user }),
    reply('GET /api/v1/reports/frame', { body: reportFrame({ report: 'planData' }) }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/reports/plan-details', { body: planDetails() }),
    reply('GET /api/v1/reports/user-access', { body: userAccessReport() }),
    reply('GET /api/v1/teams', { body: TEAMS }),
  ]);
  const rendered = renderWithProviders(<PlanDataReport />, {
    route,
    user,
    path: '/reports/plan-data',
  });
  return { api, ...rendered };
}

describe('PlanDataReport (059 US4, FR-007)', () => {
  it('opens on Data completeness and switches to People, the tab in the address', async () => {
    const { router, user } = renderPage();

    expect(await screen.findByText('By Company code')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Plan data and access' })).toBeVisible();
    await expectNoAxeViolations();

    await user.click(screen.getByRole('tab', { name: 'People' }));

    expect(await screen.findByRole('table', { name: 'People' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=people');
    expect(screen.queryByRole('button', { name: /^Filters/ })).not.toBeInTheDocument();
  });

  it('offers People only with access.manage, saying so when the address asks for it', async () => {
    const { api } = renderPage('/reports/plan-data?tab=people', VIEWER);

    expect(await screen.findByText('By Company code')).toBeInTheDocument();
    expect(screen.getByText('This view changed')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Data completeness']);
    expect(api.requests.some((r) => r.path === '/api/v1/reports/user-access')).toBe(false);
  });
});
