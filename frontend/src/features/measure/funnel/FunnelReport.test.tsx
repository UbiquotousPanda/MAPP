import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { closestTo, nth } from '@/testing/dom';
import { reportFrame } from '@/testing/fixtures/reports';
import {
  VARIANCE_CASES,
  funnelRanked,
  funnelRankedWith,
  funnelReport,
} from '@/testing/fixtures/revenue';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import type { MockedApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { choose } from '@/testing/select';
import type { FunnelCards } from '../revenue/api';
import { FunnelReport } from './FunnelReport';

// jsdom has no canvas for ECharts to measure text; report-chart.test.ts covers what is drawn.
vi.mock('echarts/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  init: () => ({ setOption() {}, resize() {}, dispose() {} }),
}));

function renderPage(
  report: Answer<'GET /api/v1/reports/funnel'> = { body: funnelReport() },
  route = '/reports/funnel?year=2026',
  ranked: Answer<'GET /api/v1/reports/funnel/ranked'> = { body: funnelRanked() },
) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: reportFrame() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/settings/activity-categories', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/reports/funnel', report),
    reply('GET /api/v1/reports/funnel/ranked', ranked),
    reply('GET /api/v1/reports/{report}/export', () => new Response('file')),
  ]);
  const rendered = renderWithProviders(<FunnelReport />, {
    route,
    user: testUser(),
    path: '/reports/funnel',
  });
  return { ...rendered, api };
}

const asked = (api: MockedApi, path: string) =>
  api.requests.filter((r) => r.path === path).map((r) => new URLSearchParams(r.search));

describe('FunnelReport (049 US2)', () => {
  it('opens on the first available stage and shows its cards, accessibly (FR-015)', async () => {
    renderPage();

    expect(await screen.findByRole('combobox', { name: 'Funnel stage' })).toHaveTextContent(
      'Inquiries (INQ)',
    );
    const cards = await screen.findByLabelText('Summary: Inquiries (INQ)');
    for (const label of ['Goal', 'Actual', 'Actual or projected', 'Performance', 'Conversion']) {
      expect(within(cards).getByText(label)).toBeInTheDocument();
    }
    const ranked = screen.getByRole('region', { name: 'Ranked list' });
    expect(within(ranked).getByText('Stage: Inquiries (INQ)')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it.each([
    [1, '1 plan uses a model that does not allow this stage.'],
    [2, '2 plans use a model that does not allow this stage.'],
  ])(
    'states how many plans are uncovered by the selected stage, %i in agreement (FR-018, 049-C11)',
    async (uncoveredCount, sentence) => {
      renderPage({ body: funnelReport({ uncoveredCount }) });

      expect(await screen.findByText(sentence)).toBeInTheDocument();
    },
  );

  it('shows "—" for conversion when there is no previous stage, never a zero (FR-017)', async () => {
    renderPage({
      body: funnelReport({
        cards: {
          ...funnelReport().cards,
          conversion: { value: null, reason: 'noPreviousStage' },
        },
      }),
    });

    const cards = await screen.findByLabelText(/^Summary/);
    expect(within(cards).getByText('—')).toBeInTheDocument();
  });

  it.each(VARIANCE_CASES)(
    'performance %s with the API\'s variance %s shows "%s" on the card, and a ranked row its figure and word or "—" (048-C1, FR-018, FR-023)',
    async (value, variance, word) => {
      const cards = funnelReport().cards;
      const performance: FunnelCards['performance'] = {
        value,
        reason: value === null ? 'noGoal' : '',
        variance,
      };
      renderPage({ body: funnelReport({ cards: { ...cards, performance } }) }, undefined, {
        body: funnelRankedWith(value, variance),
      });

      const summary = await screen.findByLabelText(/^Summary/);
      expect(within(summary).getByText(word)).toBeInTheDocument();
      const ranked = screen.getByRole('region', { name: 'Ranked list' });
      const row = await within(ranked).findByRole('row', { name: /^Helix launch/ });
      for (const shown of value === null ? ['—'] : [`${value}%`, word]) {
        expect(within(row).getAllByText(shown).length).toBeGreaterThan(0);
      }
      await expectNoAxeViolations();
    },
  );

  it('charts goal, actual and projected volume by month with today marked (FR-004, 047 FR-010)', async () => {
    const { user } = renderPage();

    expect(await screen.findByRole('img', { name: /today is in/ })).toBeInTheDocument();
    await user.click(nth(screen.getAllByRole('button', { name: 'Table' }), 0));

    const table = screen.getByRole('table', { name: /Volume by month/ });
    expect(within(table).getAllByRole('row')).toHaveLength(14);
  });

  it('fails on its own: the ranked list stays when the figures fail', async () => {
    renderPage({ status: 500, body: apiError('internal_error', 'Something went wrong.') });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(await screen.findByText('Helix launch')).toBeInTheDocument();
  });

  it('keeps the chosen stage in the address and asks every widget for it (FR-015, FR-019)', async () => {
    const { user, api, router } = renderPage();

    await screen.findByText('Helix launch');
    await choose(
      user,
      screen.getByRole('combobox', { name: 'Funnel stage' }),
      'Marketing-qualified leads (MQL)',
    );

    expect(new URLSearchParams(router.state.location.search).get('stage')).toBe('mql');
    await waitFor(() =>
      expect(asked(api, '/api/v1/reports/funnel').at(-1)?.get('stage')).toBe('mql'),
    );
    expect(asked(api, '/api/v1/reports/funnel/ranked').at(-1)?.get('stage')).toBe('mql');
  });

  it('restores the stage and category from the address, as a saved view or Back reopens them (US3 scenario 3, FR-019)', async () => {
    const { api } = renderPage(
      { body: funnelReport({ stage: 'mql' }) },
      '/reports/funnel?year=2026&stage=mql&category=uncategorised',
    );

    expect(await screen.findByRole('combobox', { name: 'Funnel stage' })).toHaveTextContent(
      'Marketing-qualified leads (MQL)',
    );
    expect(screen.getByRole('combobox', { name: 'Activity category' })).toHaveTextContent(
      'Uncategorised',
    );
    const first = nth(asked(api, '/api/v1/reports/funnel'), 0);
    expect([first.get('stage'), first.get('category')]).toEqual(['mql', 'uncategorised']);
  });

  it('exports the stage on screen, not the first stage (FR-015, FR-019)', async () => {
    URL.createObjectURL = () => 'blob:export';
    URL.revokeObjectURL = () => {};
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user, api } = renderPage();

    await screen.findByText('Helix launch');
    await choose(
      user,
      screen.getByRole('combobox', { name: 'Funnel stage' }),
      'Marketing-qualified leads (MQL)',
    );
    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(asked(api, '/api/v1/reports/funnel/export')).toHaveLength(1));
    expect(nth(asked(api, '/api/v1/reports/funnel/export'), 0).get('stage')).toBe('mql');
    save.mockRestore();
  });

  it('offers only the sorts the API accepts, so no column sorts silently by Projected (FR-006, D-410)', async () => {
    renderPage();

    await screen.findByText('Helix launch');
    const sortable = screen
      .getAllByRole('columnheader')
      .filter((h) => within(h).queryByRole('button'))
      .map((h) => h.textContent);
    expect(sortable).toEqual(['Goal', 'Actual', 'Projected', 'Performance']);
  });

  it('names the model behind the projected figures and when it last changed (049 FR-022, SC-006)', async () => {
    const { user } = renderPage();

    const summary = await screen.findByLabelText(/^Summary/);
    expect(within(summary).getByText('From Lubricants 1.0')).toBeInTheDocument();
    await user.click(within(summary).getByRole('button', { name: 'About Actual or projected' }));
    expect(
      await screen.findByText(/Projected from Lubricants 1\.0, last changed [^T:]+ 2026\.$/),
    ).toBeInTheDocument();
  });

  it("names the model behind each row's projection in its own column (049 SC-006)", async () => {
    renderPage();

    const ranked = await screen.findByRole('region', { name: 'Ranked list' });
    expect(
      await within(ranked).findByRole('columnheader', { name: 'Projection model' }),
    ).toBeInTheDocument();
  });

  it("ends the ranked list with the API's Total row: summed volumes and the overall performance (039 FR-035)", async () => {
    const ranked = funnelRanked();
    const totals = { ...ranked.totals, goal: 777777, performance: 91 };
    renderPage(undefined, undefined, { body: { ...ranked, total: 40, totals } });

    const total = closestTo(await screen.findByRole('rowheader', { name: 'Total' }), 'tr');
    expect(total.closest('tfoot')).not.toBeNull();
    expect(total.textContent).toMatch(/777,777.*91%/);
  });

  it("ends Volume by month's Table view with the API's column totals, — where a column has none (039 FR-035)", async () => {
    const totals = { goal: 444444, actual: null, projected: 222222 };
    renderPage({ body: funnelReport({ totals }) }, '/reports/funnel?year=2026&table=periods');

    const table = await screen.findByRole('table', { name: 'Volume by month' });
    const total = closestTo(within(table).getByRole('rowheader', { name: 'Total' }), 'tr');
    expect(total.closest('tfoot')).not.toBeNull();
    expect(total.textContent).toBe('Total444,444—222,222');
  });
});
