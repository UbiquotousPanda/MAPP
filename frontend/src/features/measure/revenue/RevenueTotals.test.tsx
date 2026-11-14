import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { closestTo } from '@/testing/dom';
import { CATEGORIES } from '@/testing/fixtures/activity-categories';
import { reportFrame } from '@/testing/fixtures/reports';
import { revenueRanked, revenueReport } from '@/testing/fixtures/revenue';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { RevenueStage } from '@/testing/fixtures/performance-stages';
import type { RevenueReport as RevenueReportData } from './api';

// jsdom has no canvas for ECharts to measure text; report-chart.test.ts covers what is drawn.
vi.mock('echarts/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  init: () => ({ setOption() {}, resize() {}, dispose() {} }),
}));

function renderTable(report: RevenueReportData) {
  mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: reportFrame() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
    reply('GET /api/v1/reports/revenue', { body: report }),
    reply('GET /api/v1/reports/revenue/ranked', { body: revenueRanked() }),
  ]);
  renderWithProviders(<RevenueStage />, {
    route: '/reports/performance?year=2026&table=periods',
    user: testUser(),
    path: '/reports/performance',
  });
}

async function totalRow() {
  const table = await screen.findByRole('table', { name: 'Revenue by month' });
  return closestTo(within(table).getByRole('rowheader', { name: 'Total' }), 'tr');
}

describe('Revenue by month table (039 FR-035)', () => {
  it("ends with the API's Goal, Actual and Projected totals in a footer row", async () => {
    const usd = (amount: string) => ({ amount, currency: 'USD' });
    renderTable(
      revenueReport({
        totals: {
          goal: usd('2730000.00'),
          actual: usd('350000.01'),
          projected: usd('360000.00'),
          goalAfterYear: null,
        },
      }),
    );

    const total = await totalRow();
    expect(total.closest('tfoot')).not.toBeNull();
    expect(total.textContent).toBe('Total$2,730,000.00$350,000.01$360,000.00');
  });

  it('shows "—" for a column the API has no total for, never 0.00', async () => {
    renderTable(
      revenueReport({ totals: { goal: null, actual: null, projected: null, goalAfterYear: null } }),
    );

    expect((await totalRow()).textContent).toBe('Total———');
  });

  it('says under the table how much goal lands after December, so the Total adds up to the card (D-414)', async () => {
    const usd = (amount: string) => ({ amount, currency: 'USD' });
    const totals = {
      goal: usd('900.00'),
      actual: null,
      projected: null,
      goalAfterYear: usd('100.00'),
    };
    renderTable(revenueReport({ totals }));

    await totalRow();
    expect(screen.getByText('Goal landing after December: $100.00.')).toBeVisible();
  });

  it('has no Total row when the table has no period', async () => {
    renderTable(revenueReport({ periods: [] }));

    const table = await screen.findByRole('table', { name: 'Revenue by month' });
    expect(within(table).queryByRole('rowheader', { name: 'Total' })).toBeNull();
  });
});
