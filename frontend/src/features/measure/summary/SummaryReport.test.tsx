import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { closestTo, nth } from '@/testing/dom';
import { reportFrame } from '@/testing/fixtures/reports';
import { summaryLeague, summaryReport } from '@/testing/fixtures/summary';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { choose } from '@/testing/select';
import { TABLES } from './schemas';
import { SummaryReport } from './SummaryReport';

// jsdom has no canvas for ECharts to measure text; report-chart.test.ts covers what is drawn.
vi.mock('echarts/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  init: () => ({ setOption() {}, resize() {}, dispose() {} }),
}));

const LEAGUE = '/api/v1/reports/summary/league/';

function renderPage(
  report: Answer<'GET /api/v1/reports/summary'> = { body: summaryReport() },
  route = '/reports/summary?year=2026',
  league = summaryLeague,
) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: reportFrame() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/settings/activity-categories', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/reports/summary', report),
    ...TABLES.map(({ table }) =>
      reply('GET /api/v1/reports/summary/league/{table}', { body: league(table) }, { table }),
    ),
  ]);
  const rendered = renderWithProviders(<SummaryReport />, {
    route,
    user: testUser(),
    path: '/reports/summary',
  });
  return { ...rendered, api };
}

describe('SummaryReport (048 US1, US2)', () => {
  it('shows revenue against goal with its word, and the goals planned in activities apart from it, accessibly (FR-005, FR-006, 048-C1)', async () => {
    renderPage();

    const cards = await screen.findByLabelText('Revenue figures');
    expect(within(cards).getByText('12%')).toBeInTheDocument();
    expect(within(cards).getByText('Below plan')).toBeInTheDocument();
    expect(within(cards).queryByText(/INQ 50%/)).toBeNull();
    expect(screen.getByText('INQ 50% · MQL 50% · Revenue 50%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Revenue' })).toBeInTheDocument();
    await screen.findAllByText('North');
    await expectNoAxeViolations();
  });

  it('shows the funnel stages and the MQL conversion with its goal and word in one strip (FR-009, FR-010)', async () => {
    renderPage();

    const stages = await screen.findByLabelText('Stage figures');
    const inq = nth(within(stages).getAllByText('INQ'), 0).closest('div');
    expect(inq).toHaveTextContent('120Goal 100 · 120%Above plan');
    const conversion = within(stages).getByText('MQL conversion').closest('div');
    expect(conversion).toHaveTextContent('MQL conversion20.4%Goal 20.0%Above plan');
    expect(
      screen.getByRole('img', { name: /^Revenue actual or projected .*today is in Jun 2026/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /^Conversion rate .*today is in Jun 2026/ }),
    ).toBeInTheDocument();
  });

  it.each([
    ['nothingMatches' as const, 'No activities match the filters.'],
    ['noGoals' as const, /have no goals yet/],
    ['noPerformanceData' as const, /No actuals yet — the figures below are projections/],
    ['notApproved' as const, /not approved yet/],
  ])('names the %s state instead of showing zeros (FR-018)', async (state, text) => {
    renderPage({ body: summaryReport({ states: [state] }) });

    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('shows the loading state while the figures are on their way (FR-018)', async () => {
    renderPage(() => new Promise(() => {}));

    expect(await screen.findByLabelText('Loading the figures')).toBeInTheDocument();
  });

  it('fails on its own while the league tables stay (FR-018)', async () => {
    renderPage({ status: 500, body: apiError('internal_error', 'Something went wrong.') });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect((await screen.findAllByText('North')).length).toBe(4);
  });

  it('changes the segment of the four league tables with one choice, and keeps it in the address (048-C6)', async () => {
    const { user, api, router } = renderPage();
    await screen.findAllByText('North');
    expect(screen.getByRole('heading', { level: 2, name: 'Top five by Region' })).toBeVisible();
    const before = api.requests.filter((r) => r.path.startsWith(LEAGUE)).length;

    await choose(user, screen.getByRole('combobox', { name: 'Segment' }), 'Business unit');

    await waitFor(() =>
      expect(api.requests.filter((r) => r.path.startsWith(LEAGUE)).length).toBe(before + 4),
    );
    const after = api.requests.filter((r) => r.path.startsWith(LEAGUE)).slice(before);
    expect(after.map((r) => r.path).sort()).toEqual(
      TABLES.map(({ table }) => `${LEAGUE}${table}`).sort(),
    );
    expect(after.every((r) => r.search.includes('segment=ATTR-P'))).toBe(true);
    const search = router.state.location.search;
    expect(TABLES.every(({ param }) => search.includes(`${param}=ATTR-P`))).toBe(true);
  });

  it('offers a reset when the filters exclude everything (FR-018)', async () => {
    renderPage({ body: summaryReport({ states: ['nothingMatches'] }) });

    expect(await screen.findByRole('link', { name: 'Reset the filters' })).toBeInTheDocument();
  });

  it('says which plans cost and ROI cover when some financial data is hidden (FR-003)', async () => {
    renderPage({ body: summaryReport({ financeCovers: { plans: 1, of: 2 } }) });

    expect(await screen.findAllByText('Covers 1 of 2 plans')).toHaveLength(2);
  });

  it('shows the league tables without segments when no attribute is a segment (048-C4)', async () => {
    renderPage(undefined, undefined, (table) =>
      summaryLeague(table, { segment: null, segments: [], rows: [] }),
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Top five' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Top revenue' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Segment' })).toBeNull();
  });

  it('says which stage leaves out plans whose model does not have it (048-C7)', async () => {
    const report = summaryReport();
    report.funnel.stages = report.funnel.stages.map((s) =>
      s.stage === 'inq' ? { ...s, plansWithout: 1 } : s,
    );
    renderPage({ body: report });

    expect(
      await screen.findByText('INQ leaves out 1 plan whose model does not have it.'),
    ).toBeInTheDocument();
  });

  it('shows a dash, not No goal, beside a goal when the rate is missing (048-C1)', async () => {
    const report = summaryReport();
    report.funnel.conversions = [{ stage: 'mql', rate: null, goal: '3.0', variance: null }];
    renderPage({ body: report });

    const conversion = (await screen.findByText('MQL conversion')).closest('div');
    expect(conversion).toHaveTextContent(
      'MQL conversion—Goal 3.0%No rate until the stage before has actuals.',
    );
  });

  it('says in one line why ROI is a dash when no row has one (FR-015, 050 FR-008)', async () => {
    renderPage(undefined, undefined, (table) =>
      summaryLeague(
        table,
        table === 'roi'
          ? {
              total: null,
              reason: 'No revenue is credited to these activities',
              rows: [{ key: 'O-1', name: 'North', value: null, trend: [] }],
            }
          : {},
      ),
    );

    expect(
      await screen.findByText(
        'No revenue is credited to these activities, so ROI can’t be worked out',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('North')).toHaveLength(3);
  });

  it('names the attribution model and cost basis in the ROI tip (FR-015, 050 FR-008)', async () => {
    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'About Top ROI' }));

    expect(
      await screen.findByText(/Attribution: Equally distributed, on actual cost\./),
    ).toBeInTheDocument();
  });

  it("ends a league table's Table view with the API's total in its Total row (039 FR-035)", async () => {
    renderPage(undefined, '/reports/summary?year=2026&table=leagueRevenue');

    const total = closestTo(await screen.findByRole('rowheader', { name: 'Total' }), 'tr');
    expect(total.closest('tfoot')).not.toBeNull();
    expect(total.textContent).toBe('Total$1,200.00');
  });

  it("ends the Revenue trend's Table view with the API's column totals, — where a column has none (039 FR-035)", async () => {
    const report = summaryReport();
    const trendTotals = {
      actual: null,
      projected: { amount: '700.00', currency: 'USD' },
      goal: null,
    };
    renderPage(
      { body: { ...report, revenue: { ...report.revenue, trendTotals } } },
      '/reports/summary?year=2026&table=trend',
    );

    const table = await screen.findByRole('table', { name: 'Revenue trend' });
    const total = closestTo(within(table).getByRole('rowheader', { name: 'Total' }), 'tr');
    expect(total.closest('tfoot')).not.toBeNull();
    expect(total.textContent).toBe('Total—$700.00—');
  });
});
