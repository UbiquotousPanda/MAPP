import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { nth } from '@/testing/dom';
import { CATEGORIES } from '@/testing/fixtures/activity-categories';
import { reportFrame } from '@/testing/fixtures/reports';
import { revenueRanked, revenueReport } from '@/testing/fixtures/revenue';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import type { MockedApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { RevenueReport } from './RevenueReport';

function renderPage(
  report: Answer<'GET /api/v1/reports/revenue'> = { body: revenueReport() },
  route = '/reports/revenue?year=2026',
) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: reportFrame() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
    reply('GET /api/v1/reports/revenue', report),
    reply('GET /api/v1/reports/revenue/ranked', { body: revenueRanked() }),
    reply('GET /api/v1/reports/{report}/export', () => new Response('file')),
  ]);
  const rendered = renderWithProviders(<RevenueReport />, {
    route,
    user: testUser(),
    path: '/reports/revenue',
  });
  return { ...rendered, api };
}

const asked = (api: MockedApi, path: string) =>
  api.requests.filter((r) => r.path === path).map((r) => new URLSearchParams(r.search));

describe('RevenueReport (049 US1)', () => {
  it('shows the four cards, names the model behind the goal, and is accessible (FR-010, FR-012)', async () => {
    renderPage();

    const cards = await screen.findByLabelText('Summary');
    for (const label of ['Revenue goal', 'Actual revenue', 'Actual or projected', 'Performance']) {
      expect(within(cards).getByText(label)).toBeInTheDocument();
    }
    expect(within(cards).getByText('73%')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('explains the goal in an info tip: the plan model, projection and what the list compares (FR-014)', async () => {
    renderPage();

    const cards = await screen.findByLabelText('Summary');
    expect(within(cards).getByRole('button', { name: 'About Revenue goal' })).toBeInTheDocument();
  });

  it('shows "—" with the reason when a card cannot be worked out, never a zero (FR-009)', async () => {
    renderPage({
      body: revenueReport({
        cards: {
          goal: { value: null, reason: 'noGoal' },
          actual: { value: null, reason: 'noData' },
          projected: { value: null, reason: 'noGoal' },
          performance: { value: null, reason: 'noGoal' },
        },
      }),
    });

    const cards = await screen.findByLabelText('Summary');
    expect(within(cards).getAllByText('No goal set.').length).toBeGreaterThan(0);
    expect(within(cards).getByText('No data has arrived yet.')).toBeInTheDocument();
  });

  it('charts goal, actual and projected by month with today marked, and lists every period in the table (FR-004, 047 FR-010)', async () => {
    const { user } = renderPage();

    expect(await screen.findByRole('img', { name: /today is in/ })).toBeInTheDocument();
    await user.click(nth(screen.getAllByRole('button', { name: 'Table' }), 0));

    const table = screen.getByRole('table', { name: /Revenue by month/ });
    expect(within(table).getAllByRole('row')).toHaveLength(13);
  });

  it('shows the ROI and actual-cost columns as unavailable until feature 050 configures attribution (049-C6)', async () => {
    renderPage();

    await screen.findByText('Helix launch');
    const ranked = screen.getByRole('region', { name: 'Ranked list' });
    expect(
      within(ranked).getAllByText('Attribution is not configured yet.').length,
    ).toBeGreaterThan(0);
  });

  it('sorts the ranked list by Actual, not silently by Projected (review of 049)', async () => {
    const { user, api } = renderPage();

    await screen.findByText('Helix launch');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Actual');

    const requests = api.requests.filter((r) => r.path === '/api/v1/reports/revenue/ranked');
    expect(requests.at(-1)?.search).toContain('sort=actualRevenue');
  });

  it('fails on its own: the ranked list stays when the figures fail', async () => {
    renderPage({ status: 500, body: apiError('internal_error', 'Something went wrong.') });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(await screen.findByText('Helix launch')).toBeInTheDocument();
  });

  it('keeps the chosen category in the address and asks every widget for it (US3 scenario 3, FR-019)', async () => {
    const { user, api, router } = renderPage();

    await screen.findByText('Helix launch');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Activity category' }), 'Asset');

    expect(new URLSearchParams(router.state.location.search).get('category')).toBe('CAT-1001');
    await waitFor(() =>
      expect(asked(api, '/api/v1/reports/revenue').at(-1)?.get('category')).toBe('CAT-1001'),
    );
    expect(asked(api, '/api/v1/reports/revenue/ranked').at(-1)?.get('category')).toBe('CAT-1001');
  });

  it('restores the category from the address, as a saved view or Back reopens it (US3 scenario 3, FR-019)', async () => {
    const { api } = renderPage(undefined, '/reports/revenue?year=2026&category=uncategorised');

    expect(await screen.findByDisplayValue('Uncategorised')).toBeInTheDocument();
    expect(nth(asked(api, '/api/v1/reports/revenue'), 0).get('category')).toBe('uncategorised');
  });

  it('exports the report for the chosen category (FR-019)', async () => {
    URL.createObjectURL = () => 'blob:export';
    URL.revokeObjectURL = () => {};
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user, api } = renderPage();

    await screen.findByText('Helix launch');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Activity category' }), 'Asset');
    await user.click(nth(screen.getAllByRole('button', { name: 'Export' }), 0));
    await user.click(await screen.findByRole('menuitem', { name: 'Excel (.xlsx)' }));

    await waitFor(() => expect(asked(api, '/api/v1/reports/revenue/export')).toHaveLength(1));
    expect(nth(asked(api, '/api/v1/reports/revenue/export'), 0).get('category')).toBe('CAT-1001');
    save.mockRestore();
  });
});
