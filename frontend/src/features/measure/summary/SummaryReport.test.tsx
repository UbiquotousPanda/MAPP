import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { nth } from '@/testing/dom';
import { reportFrame } from '@/testing/fixtures/reports';
import { summaryLeague, summaryReport } from '@/testing/fixtures/summary';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { TABLES } from './schemas';
import { SummaryReport } from './SummaryReport';

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
  it('shows revenue against goal with its word and Goal coverage, and is accessible (FR-005, FR-006, 048-C1)', async () => {
    renderPage();

    const cards = await screen.findByLabelText('Revenue figures');
    expect(within(cards).getByText('12%')).toBeInTheDocument();
    expect(within(cards).getByText('Below plan')).toBeInTheDocument();
    expect(within(cards).getByText('INQ 50% · MQL 50% · Revenue 50%')).toBeInTheDocument();
    await screen.findAllByText('North');
    await expectNoAxeViolations();
  });

  it('shows the funnel stages and the MQL conversion with its goal and word (FR-009, FR-010)', async () => {
    renderPage();

    const conversions = await screen.findByLabelText('Conversions');
    expect(within(conversions).getByText('20.4%')).toBeInTheDocument();
    expect(within(conversions).getByText('Goal 20.0% · Above plan')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /today is in Jun 2026/ })).toBeInTheDocument();
  });

  it.each([
    ['nothingMatches' as const, 'No activities match the filters.'],
    ['noGoals' as const, /have no goals yet/],
    ['noPerformanceData' as const, 'No performance data has arrived yet.'],
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

  it('reloads only the league table whose segment changes, and keeps it in the address (048-C6)', async () => {
    const { user, api } = renderPage();
    await screen.findAllByText('North');
    const before = api.requests.filter((r) => r.path.startsWith(LEAGUE)).length;

    await user.selectOptions(
      nth(screen.getAllByRole('combobox', { name: 'Segment' }), 0),
      'ATTR-P',
    );

    const after = api.requests.filter((r) => r.path.startsWith(LEAGUE)).slice(before);
    expect(after.map((r) => r.path)).toEqual([`${LEAGUE}revenue`]);
    expect(after[0]?.search).toContain('segment=ATTR-P');
  });

  it('offers a reset when the filters exclude everything (FR-018)', async () => {
    renderPage({ body: summaryReport({ states: ['nothingMatches'] }) });

    expect(await screen.findByRole('link', { name: 'Reset the filters' })).toBeInTheDocument();
  });

  it('says which plans cost and ROI cover when some financial data is hidden (FR-003)', async () => {
    renderPage({ body: summaryReport({ financeCovers: { plans: 1, of: 2 } }) });

    expect(await screen.findByText('Covers 1 of 2 plans')).toBeInTheDocument();
    expect(
      await screen.findByText('Equally distributed, on actual cost · Covers 1 of 2 plans'),
    ).toBeInTheDocument();
  });

  it('shows the league tables without segments when no attribute is a segment (048-C4)', async () => {
    renderPage(undefined, undefined, (table) =>
      summaryLeague(table, { segment: null, segments: [], rows: [] }),
    );

    expect(await screen.findAllByText(/^Top .* by segment$/)).toHaveLength(4);
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

    expect(await screen.findByText('Goal 3.0% · —')).toBeInTheDocument();
  });

  it('says why an ROI is a dash beside its model (FR-015, 050 FR-008)', async () => {
    renderPage(undefined, undefined, (table) =>
      summaryLeague(table, table === 'roi' ? { total: null, reason: 'No cost recorded' } : {}),
    );

    expect(
      await screen.findByText('Equally distributed, on actual cost · No cost recorded'),
    ).toBeInTheDocument();
  });

  it('names the attribution model and cost basis beside ROI (FR-015, 050 FR-008)', async () => {
    renderPage();

    expect(await screen.findByText('Equally distributed, on actual cost')).toBeInTheDocument();
  });
});
