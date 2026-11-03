import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { nth } from '@/testing/dom';
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
import type { FunnelCards } from '../revenue/api';
import { FunnelReport } from './FunnelReport';

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

    expect(await screen.findByDisplayValue('INQ')).toBeInTheDocument();
    const cards = await screen.findByLabelText('Summary');
    for (const label of [
      'INQ goal',
      'INQ actual',
      'INQ actual or projected',
      'Performance',
      'Conversion',
    ]) {
      expect(within(cards).getByText(label)).toBeInTheDocument();
    }
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

    const cards = await screen.findByLabelText('Summary');
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

      const summary = await screen.findByLabelText('Summary');
      expect(within(summary).getByText(word)).toBeInTheDocument();
      const ranked = screen.getByRole('region', { name: 'Ranked list' });
      const shown = value === null ? '—' : `${value}% · ${word}`;
      expect((await within(ranked).findAllByText(shown)).length).toBeGreaterThan(0);
      await expectNoAxeViolations();
    },
  );

  it('charts goal, actual and projected volume by month with today marked (FR-004, 047 FR-010)', async () => {
    const { user } = renderPage();

    expect(await screen.findByRole('img', { name: /today is in/ })).toBeInTheDocument();
    await user.click(nth(screen.getAllByRole('button', { name: 'Table' }), 0));

    const table = screen.getByRole('table', { name: /Volume by month/ });
    expect(within(table).getAllByRole('row')).toHaveLength(13);
  });

  it('fails on its own: the ranked list stays when the figures fail', async () => {
    renderPage({ status: 500, body: apiError('internal_error', 'Something went wrong.') });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(await screen.findByText('Helix launch')).toBeInTheDocument();
  });

  it('keeps the chosen stage in the address and asks every widget for it (FR-015, FR-019)', async () => {
    const { user, api, router } = renderPage();

    await screen.findByText('Helix launch');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Funnel stage' }), 'MQL');

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

    expect(await screen.findByDisplayValue('MQL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Uncategorised')).toBeInTheDocument();
    const first = nth(asked(api, '/api/v1/reports/funnel'), 0);
    expect([first.get('stage'), first.get('category')]).toEqual(['mql', 'uncategorised']);
  });

  it('exports the stage on screen, not the first stage (FR-015, FR-019)', async () => {
    URL.createObjectURL = () => 'blob:export';
    URL.revokeObjectURL = () => {};
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user, api } = renderPage();

    await screen.findByText('Helix launch');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Funnel stage' }), 'MQL');
    await user.click(nth(screen.getAllByRole('button', { name: 'Export' }), 0));
    await user.click(await screen.findByRole('menuitem', { name: 'Excel (.xlsx)' }));

    await waitFor(() => expect(asked(api, '/api/v1/reports/funnel/export')).toHaveLength(1));
    expect(nth(asked(api, '/api/v1/reports/funnel/export'), 0).get('stage')).toBe('mql');
    save.mockRestore();
  });

  it('offers only the sorts the API accepts, so no column sorts silently by Projected (FR-006)', async () => {
    renderPage();

    await screen.findByText('Helix launch');
    const sortBy = screen.getByRole('combobox', { name: 'Sort by' });
    const values = within(sortBy)
      .getAllByRole('option')
      .map((o) => o.getAttribute('value'));
    expect(values).toEqual(['actual', 'projected']);
  });
});
