import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { nth } from '@/testing/dom';
import { CATEGORIES } from '@/testing/fixtures/activity-categories';
import { reportFrame } from '@/testing/fixtures/reports';
import {
  VARIANCE_CASES,
  revenueRanked,
  revenueRankedWith,
  revenueReport,
} from '@/testing/fixtures/revenue';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import type { MockedApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import type { RevenueCards } from './api';
import { RevenueReport } from './RevenueReport';

function renderPage(
  report: Answer<'GET /api/v1/reports/revenue'> = { body: revenueReport() },
  route = '/reports/revenue?year=2026',
  ranked: Answer<'GET /api/v1/reports/revenue/ranked'> = { body: revenueRanked() },
  frame = reportFrame(),
) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: frame }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
    reply('GET /api/v1/reports/revenue', report),
    reply('GET /api/v1/reports/revenue/ranked', ranked),
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
          performance: { value: null, reason: 'noGoal', variance: 'noGoal' },
        },
      }),
    });

    const cards = await screen.findByLabelText('Summary');
    expect(within(cards).getAllByText('No goal set.').length).toBeGreaterThan(0);
    expect(within(cards).getByText('No data has arrived yet.')).toBeInTheDocument();
  });

  it.each(VARIANCE_CASES)(
    'performance %s with the API\'s variance %s shows "%s" on the card, and a ranked row its figure and word or "—" (048-C1, FR-018, FR-023)',
    async (value, variance, word) => {
      const cards = revenueReport().cards;
      const performance: RevenueCards['performance'] = {
        value,
        reason: value === null ? 'noGoal' : '',
        variance,
      };
      renderPage({ body: revenueReport({ cards: { ...cards, performance } }) }, undefined, {
        body: revenueRankedWith(value, variance),
      });

      const summary = await screen.findByLabelText('Summary');
      expect(within(summary).getByText(word)).toBeInTheDocument();
      const ranked = screen.getByRole('region', { name: 'Ranked list' });
      const shown = value === null ? '—' : `${value}% · ${word}`;
      expect((await within(ranked).findAllByText(shown)).length).toBeGreaterThan(0);
      await expectNoAxeViolations();
    },
  );

  it('charts goal, actual and projected by month with today marked, and lists every period in the table (FR-004, 047 FR-010)', async () => {
    const { user } = renderPage();

    expect(await screen.findByRole('img', { name: /today is in/ })).toBeInTheDocument();
    await user.click(nth(screen.getAllByRole('button', { name: 'Table' }), 0));

    const table = screen.getByRole('table', { name: /Revenue by month/ });
    expect(within(table).getAllByRole('row')).toHaveLength(13);
  });

  it('names the model and cost basis beside attributed revenue and ROI (050 FR-008, FR-010)', async () => {
    renderPage();

    await screen.findByText('Helix launch');
    const ranked = screen.getByRole('region', { name: 'Ranked list' });
    expect(
      within(ranked).getByRole('columnheader', {
        name: /^ROI \(Equally distributed, on actual cost\)/,
      }),
    ).toBeInTheDocument();
    expect(
      within(ranked).getByRole('columnheader', {
        name: /^Attributed revenue \(Equally distributed\)/,
      }),
    ).toBeInTheDocument();
    expect(within(ranked).getAllByText('20%').length).toBeGreaterThan(0);
  });

  it('sorts the ranked list by Actual, not silently by Projected (review of 049)', async () => {
    const { user, api } = renderPage();

    await screen.findByText('Helix launch');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Actual');

    const requests = api.requests.filter((r) => r.path === '/api/v1/reports/revenue/ranked');
    expect(requests.at(-1)?.search).toContain('sort=actualRevenue');
  });

  it('offers only the sorts the API accepts, so no column sorts silently by Projected (FR-006)', async () => {
    renderPage();

    await screen.findByText('Helix launch');
    const sortBy = screen.getByRole('combobox', { name: 'Sort by' });
    const values = within(sortBy)
      .getAllByRole('option')
      .map((o) => o.getAttribute('value'));
    expect(values).toEqual(['actualRevenue', 'projectedRevenue']);
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

  it('names the model behind the projected figures and when it last changed (049 FR-022, SC-006)', async () => {
    renderPage();

    const summary = await screen.findByLabelText('Summary');
    expect(
      within(summary).getByText(/^Projected from Lubricants 1\.0, last changed [^T:]+ 2026\.$/),
    ).toBeInTheDocument();
  });

  it('names every model in view when the plans use more than one (049 SC-006)', async () => {
    const report = revenueReport();
    report.projections = [
      { modelName: 'Lubricants 1.0', modelChangedAt: '2026-01-02T09:00:00Z' },
      { modelName: 'Mobility 1.0', modelChangedAt: '2026-01-05T09:00:00Z' },
    ];
    renderPage({ body: report });

    const summary = await screen.findByLabelText('Summary');
    expect(
      within(summary).getByText(
        /^Projected from Lubricants 1\.0, last changed [^;]+; and Mobility 1\.0, last changed [^T:]+ 2026\.$/,
      ),
    ).toBeInTheDocument();
  });

  it("shows each entry's owner and the model behind its projection (049 FR-012, SC-006)", async () => {
    const ranked = revenueRanked();
    const entry = nth(nth(ranked.groups, 0).entries, 0);
    entry.owner = { id: 'U-1002', name: 'Priya Raman', inactive: false };
    entry.figures.projection = {
      modelName: 'Lubricants 1.0',
      modelChangedAt: '2026-01-02T09:00:00Z',
    };
    renderPage(undefined, undefined, { body: ranked });

    const list = await screen.findByRole('region', { name: 'Ranked list' });
    const row = await within(list).findByRole('row', { name: /^Helix launch/ });
    expect(within(list).getByRole('columnheader', { name: 'Owner' })).toBeInTheDocument();
    expect(within(list).getByRole('columnheader', { name: 'Model' })).toBeInTheDocument();
    expect(row).toHaveTextContent('Priya Raman');
    expect(row).toHaveTextContent('Lubricants 1.0');
  });

  it('says cost and ROI leave out the plans whose finances are hidden, when only some are (050 FR-007, #154)', async () => {
    renderPage(undefined, undefined, undefined, reportFrame({ finance: { plans: 1, of: 2 } }));

    expect(await screen.findByText(PARTIAL_FINANCE)).toBeInTheDocument();
  });

  it("says nothing about hidden finances when every plan's are shown (050 FR-007, #154)", async () => {
    renderPage();

    await screen.findByText('Helix launch');
    expect(screen.queryByText(PARTIAL_FINANCE)).not.toBeInTheDocument();
  });
});

const PARTIAL_FINANCE =
  'Actual cost and ROI leave out the plans whose financial data you may not see.';
