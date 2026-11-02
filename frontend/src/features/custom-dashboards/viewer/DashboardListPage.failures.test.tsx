import { screen, waitFor, within } from '@testing-library/react';
import type { HttpHandler } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  dashboardSummary,
  DANIEL_PERSON,
  VIEWER_ACCESS,
  withPermissions,
} from '@/testing/fixtures/shared-dashboards';
import { mockApi } from '@/testing/mock-api';
import { findMessages, renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { DashboardListPage } from './DashboardListPage';

const SHARED = dashboardSummary({
  id: 'DB-1002',
  name: 'China leads',
  owner: DANIEL_PERSON,
  sharedWith: [],
  access: VIEWER_ACCESS,
});

function renderPage(answers: HttpHandler[]) {
  mockApi([
    reply('GET /api/v1/custom-dashboards', {
      body: { mine: [dashboardSummary()], sharedWithMe: [SHARED] },
    }),
    ...answers,
  ]);
  return renderWithProviders(<DashboardListPage />, {
    route: '/dashboards',
    path: '/dashboards',
    user: withPermissions(['plans.view', 'dashboards.view', 'dashboards.build']),
  });
}

async function choose(user: ReturnType<typeof renderPage>['user'], card: string, item: string) {
  await user.click(await screen.findByRole('button', { name: `Actions for ${card}` }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

describe('051 FR-010, FR-011: a refused copy or delete says why and changes nothing', () => {
  it('names the reason a copy failed — the dashboard is gone — and stays on Dashboards', async () => {
    const { user, router } = renderPage([
      reply('POST /api/v1/custom-dashboards/{dashboardId}/copy', {
        status: 404,
        body: apiError('not_found', 'Dashboard not found.'),
      }),
    ]);

    await choose(user, 'China leads', 'Make a copy');

    const messages = await findMessages();
    await waitFor(() => expect(messages).toHaveTextContent('Dashboard not found.'));
    expect(messages).not.toHaveTextContent('Copy made');
    expect(router.state.location.pathname).toBe('/dashboards');
  });

  it('closes the question, names the reason a delete failed and offers no Undo', async () => {
    const { user } = renderPage([
      reply('DELETE /api/v1/custom-dashboards/{dashboardId}', {
        status: 404,
        body: apiError('not_found', 'Dashboard not found.'),
      }),
    ]);

    await choose(user, 'Lubricants Europe overview', 'Delete');
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete dashboard' }));

    const messages = await findMessages();
    await waitFor(() => expect(messages).toHaveTextContent('Dashboard not found.'));
    expect(within(messages).queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
