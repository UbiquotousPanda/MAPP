import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { nth } from '@/testing/dom';
import { CATEGORIES } from '@/testing/fixtures/activity-categories';
import { reportFrame } from '@/testing/fixtures/reports';
import {
  funnelRanked,
  funnelReport,
  revenueRanked,
  revenueReport,
} from '@/testing/fixtures/revenue';
import { summaryReport } from '@/testing/fixtures/summary';
import { openFilters } from '@/testing/filters';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import type { MockedApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { choose } from '@/testing/select';
import { PerformanceReport } from './PerformanceReport';

// jsdom has no canvas for ECharts to measure text; report-chart.test.ts covers what is drawn.
vi.mock('echarts/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  init: () => ({ setOption() {}, resize() {}, dispose() {} }),
}));

interface Options {
  summary?: Answer<'GET /api/v1/reports/summary'>;
  funnel?: Answer<'GET /api/v1/reports/funnel'>;
  frame?: ReturnType<typeof reportFrame>;
}

function renderPage(route = '/reports/performance?year=2026', options: Options = {}) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: options.frame ?? reportFrame() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
    reply('GET /api/v1/reports/summary', options.summary ?? { body: summaryReport() }),
    reply('GET /api/v1/reports/revenue', { body: revenueReport() }),
    reply('GET /api/v1/reports/revenue/ranked', { body: revenueRanked() }),
    reply('GET /api/v1/reports/funnel', options.funnel ?? { body: funnelReport() }),
    reply('GET /api/v1/reports/funnel/ranked', { body: funnelRanked() }),
    reply('GET /api/v1/reports/{report}/export', () => new Response('file')),
  ]);
  const rendered = renderWithProviders(<PerformanceReport />, {
    route,
    user: testUser(),
    path: '/reports/performance',
  });
  return { ...rendered, api };
}

const asked = (api: MockedApi, path: string) =>
  api.requests.filter((r) => r.path === path).map((r) => new URLSearchParams(r.search));

const stagePicker = () => screen.getByRole('group', { name: 'Stage' });

describe('PerformanceReport (059 US1)', () => {
  it('shows the overview, then Revenue as the stage, accessibly (US1 scenario 1, FR-002)', async () => {
    renderPage();

    const figures = await screen.findByLabelText('Revenue figures');
    expect(within(figures).getByText('12%')).toBeInTheDocument();
    expect(within(figures).getByText('Below plan')).toBeInTheDocument();
    expect(screen.getByText('INQ 50% · MQL 50% · Revenue 50%')).toBeInTheDocument();
    const stages = screen.getByLabelText('Stage figures');
    expect(within(stages).getByText('MQL conversion').closest('div')).toHaveTextContent(
      'MQL conversion20.4%Goal 20.0%Above plan',
    );
    expect(screen.queryByRole('table', { name: 'Revenue trend' })).toBeNull();
    expect(within(stagePicker()).getByRole('button', { name: 'Revenue' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText('Helix launch')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('shows the loading state while the overview is on its way', async () => {
    renderPage(undefined, { summary: () => new Promise(() => {}) });

    expect(await screen.findByLabelText('Loading the overview')).toBeInTheDocument();
  });

  it('fails on its own: the stage and its ranked list stay when the overview fails', async () => {
    renderPage(undefined, {
      summary: { status: 500, body: apiError('internal_error', 'Something went wrong.') },
    });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(await screen.findByText('Helix launch')).toBeInTheDocument();
  });

  it('says there are no plans for the year instead of showing zeros', async () => {
    const frame = reportFrame({
      inView: { plans: 0, campaigns: 0, initiatives: 0, activities: 0, lineItems: 0 },
    });
    renderPage(undefined, { frame });

    expect(await screen.findByText('No plans you may see for 2026')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Stage' })).toBeNull();
  });

  it.each([
    ['nothingMatches', 'No activities match the filters.'],
    ['noGoals', /have no goals yet/],
    ['notApproved', /not approved yet/],
  ] as const)('names the %s state in the overview (048 FR-018)', async (state, text) => {
    renderPage(undefined, { summary: { body: summaryReport({ states: [state] }) } });

    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('says which stage leaves out plans, and a dash beside a goal when a rate is missing (048-C1, 048-C7)', async () => {
    const report = summaryReport();
    report.funnel.stages = report.funnel.stages.map((s) =>
      s.stage === 'inq' ? { ...s, plansWithout: 1 } : s,
    );
    report.funnel.conversions = [{ stage: 'mql', rate: null, goal: '3.0', variance: null }];
    renderPage(undefined, { summary: { body: report } });

    expect(
      await screen.findByText('INQ leaves out 1 plan whose model does not have it.'),
    ).toBeInTheDocument();
    expect(screen.getByText('MQL conversion').closest('div')).toHaveTextContent(
      'MQL conversion—Goal 3.0%No rate until the stage before has actuals.',
    );
  });

  it('switches to MQL: its widgets, the conversion trend, the ranked list and the address follow (US1 scenario 2)', async () => {
    const { user, api, router } = renderPage();
    await screen.findByText('Helix launch');

    await user.click(within(stagePicker()).getByRole('button', { name: 'MQL' }));

    expect(new URLSearchParams(router.state.location.search).get('stage')).toBe('mql');
    expect(await screen.findByText('Stage: Marketing-qualified leads (MQL)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Conversion rate/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(asked(api, '/api/v1/reports/funnel/ranked').at(-1)?.get('stage')).toBe('mql'),
    );
    expect(asked(api, '/api/v1/reports/summary').every((q) => !q.has('stage'))).toBe(true);
  });

  it('offers only the stages a model in view allows (049-C11)', async () => {
    renderPage(undefined, { funnel: { body: funnelReport({ availableStages: ['inq'] }) } });

    await screen.findByText('Helix launch');
    await waitFor(() =>
      expect(within(stagePicker()).getByRole('button', { name: 'INQ' })).toBeInTheDocument(),
    );
    expect(within(stagePicker()).queryByRole('button', { name: 'MQL' })).toBeNull();
  });

  it('opens Revenue with a notice when the address asks for a stage no longer offered', async () => {
    renderPage('/reports/performance?year=2026&stage=deals');

    expect(await screen.findByText('This view changed')).toBeInTheDocument();
    expect(within(stagePicker()).getByRole('button', { name: 'Revenue' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText('Helix launch')).toBeInTheDocument();
  });

  it('puts the activity category behind Filters (n), asks every widget for it and exports it (059-P1, 049 FR-019)', async () => {
    URL.createObjectURL = () => 'blob:export';
    URL.revokeObjectURL = () => {};
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user, api, router } = renderPage();
    await screen.findByText('Helix launch');

    await openFilters(user);
    await user.click(screen.getByRole('button', { name: /^Activity category/ }));
    await user.click(await screen.findByRole('radio', { name: 'Asset' }));

    expect(new URLSearchParams(router.state.location.search).get('category')).toBe('CAT-1001');
    expect(await screen.findByRole('button', { name: /Filters \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText('Activity category: Asset')).toBeInTheDocument();
    for (const path of ['summary', 'revenue', 'revenue/ranked']) {
      await waitFor(() =>
        expect(asked(api, `/api/v1/reports/${path}`).at(-1)?.get('category')).toBe('CAT-1001'),
      );
    }
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(asked(api, '/api/v1/reports/performance/export')).toHaveLength(1));
    expect(nth(asked(api, '/api/v1/reports/performance/export'), 0).get('category')).toBe(
      'CAT-1001',
    );
    save.mockRestore();
  });

  it('restores the stage and category from the address, as a saved view or Back reopens them', async () => {
    const { api } = renderPage('/reports/performance?year=2026&stage=mql&category=uncategorised', {
      funnel: { body: funnelReport({ stage: 'mql' }) },
    });

    expect(await screen.findByText('Activity category: Uncategorised')).toBeInTheDocument();
    expect(within(stagePicker()).getByRole('button', { name: 'MQL' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => expect(asked(api, '/api/v1/reports/funnel').length).toBeGreaterThan(0));
    const first = nth(asked(api, '/api/v1/reports/funnel'), 0);
    expect([first.get('stage'), first.get('category')]).toEqual(['mql', 'uncategorised']);
  });

  it('groups the ranked list by a Shell attribute (US1 scenario 3, FR-003)', async () => {
    const { user, api } = renderPage('/reports/performance?year=2026&show=activity');
    await screen.findByText('Helix launch');

    await choose(user, screen.getByRole('combobox', { name: 'Group by' }), 'Brand');

    await waitFor(() =>
      expect(asked(api, '/api/v1/reports/revenue/ranked').at(-1)?.get('group')).toBe(
        'attr:SA-1022',
      ),
    );
  });

  it('sorts the ranked list by ROI (US1 scenario 3, FR-003)', async () => {
    const { user, api } = renderPage();
    await screen.findByText('Helix launch');

    await user.click(within(screen.getByRole('columnheader', { name: 'ROI' })).getByRole('button'));

    await waitFor(() =>
      expect(asked(api, '/api/v1/reports/revenue/ranked').at(-1)?.get('sort')).toBe('roi'),
    );
  });
});
