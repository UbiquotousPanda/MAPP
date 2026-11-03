import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { components } from '@/api/generated/schema';
import { expectNoAxeViolations } from '@/testing/axe';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { PerformancePanel } from './PerformancePanel';

type Panel = components['schemas']['PerformancePanel'];
type SplitMonth = components['schemas']['SplitMonth'];

const PANEL = 'GET /api/v1/activities/{activityId}/performance';

function month(n: number, actual: number | null, projected: number | null): SplitMonth {
  return { month: `2026-${String(n).padStart(2, '0')}`, actual, projected, inProgress: n === 3 };
}

const INQ_MONTHS = [month(1, 300, null), month(2, null, null), month(3, 120, 2758)];
const MQL_MONTHS = [month(1, null, null), month(2, null, null), month(3, null, 55)];

function panel(withMonths: boolean): Panel {
  const usd = (amount: string) => ({ amount, currency: 'USD' });
  return {
    state: 'ok',
    stages: [
      {
        stage: 'inq',
        goal: 4000,
        actual: 420,
        projected: 3058,
        conversion: null,
        reason: '',
        projectedReason: '',
        months: withMonths ? INQ_MONTHS : [],
      },
      {
        stage: 'mql',
        goal: 800,
        actual: null,
        projected: 55,
        conversion: null,
        reason: 'noData',
        projectedReason: '',
        months: withMonths ? MQL_MONTHS : [],
      },
    ],
    revenue: {
      goal: usd('450000.00'),
      actual: null,
      excludedCount: 0,
      reason: 'noData',
      projected: usd('30000.00'),
      projectedReason: '',
      months: withMonths
        ? [
            { month: '2026-01', actual: null, projected: null, inProgress: false },
            { month: '2026-02', actual: null, projected: null, inProgress: false },
            { month: '2026-03', actual: null, projected: usd('30000.00'), inProgress: true },
          ]
        : [],
    },
    webMetrics: [],
    sources: [],
    projection: withMonths
      ? { modelName: 'Lubricants 1.0', modelChangedAt: '2026-01-02T09:00:00Z' }
      : null,
  };
}

function renderPanel(answer: Panel) {
  mockApi([reply(PANEL, { body: answer }, { activityId: 'A-1042' })]);
  return renderWithProviders(<PerformancePanel activityId="A-1042" />, { user: testUser() });
}

describe('the months behind the projection (047 US2, FR-010, FR-016)', () => {
  it('047 FR-016 lists each month with its actual and projected figures on request', async () => {
    const { user } = renderPanel(panel(true));

    await user.click(await screen.findByText('Months behind the projection'));
    const months = screen.getByRole('table', { name: 'Months behind the projection' });

    expect(within(months).getByRole('columnheader', { name: 'INQ projected' })).toBeVisible();
    expect(within(months).getByRole('row', { name: /^Jan 2026 300 — — —/ })).toBeVisible();
    expect(within(months).getByRole('row', { name: /^Feb 2026 — — — —/ })).toBeVisible();
    await expectNoAxeViolations();
  });

  it('047 FR-010 marks the month in progress, which carries both its actual and its projection', async () => {
    const { user } = renderPanel(panel(true));

    await user.click(await screen.findByText('Months behind the projection'));

    const march = screen.getByRole('row', { name: /^Mar 2026 · this month/ });
    expect(march).toHaveTextContent('120');
    expect(march).toHaveTextContent('2,758');
    expect(march).toHaveTextContent('55');
    expect(march).toHaveTextContent(/30,000\.00/);
    expect(screen.getAllByText(/this month/)).toHaveLength(1);
  });

  it('047 FR-013 offers no months when nothing projects', async () => {
    renderPanel(panel(false));

    expect(await screen.findByRole('row', { name: /^INQ/ })).toBeInTheDocument();
    expect(screen.queryByText('Months behind the projection')).not.toBeInTheDocument();
  });
});
