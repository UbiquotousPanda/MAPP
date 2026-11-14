import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { reportFrame } from '@/testing/fixtures/reports';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { choose } from '@/testing/select';
import { reply } from '@/testing/replies';
import type { PlanDetailsReport as Report } from './api';
import { planDetails } from './plan-details-fixture';
import { PlanDataReport } from '../plan-data/PlanDataReport';

function renderReport(
  report: Report = planDetails(),
  frame = reportFrame({ report: 'planData' }),
  route = '/reports/plan-data',
) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: frame }),
    reply('GET /api/v1/reports/plan-details', { body: report }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
  ]);
  const { user } = renderWithProviders(<PlanDataReport />, {
    route,
    user: testUser(),
    path: '/reports/plan-data',
  });
  return Object.assign(api, { user });
}

describe('Data completeness (043 US1, FR-005 – FR-016)', () => {
  it('shows the cards, the built-in section and one row per attribute', async () => {
    const api = renderReport();

    expect(await screen.findByText('By Company code')).toBeInTheDocument();
    expect(screen.getByText('20 of 28 (71 %)')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Built-in fields' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Company code' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Shell attributes' });
    expect(
      within(nav).getByRole('button', { name: 'Company code 79 % filled in' }),
    ).toBeInTheDocument();
    expect(api.requests.find((r) => r.path === '/api/v1/reports/plan-details')?.search).toContain(
      'period=month',
    );
    await expectNoAxeViolations();
  });

  it('lists the attributes worst filled in first by default, or in Settings order (FR-012)', async () => {
    const report = planDetails();
    const [first] = report.attributes;
    if (!first) {
      throw new Error('The fixture has no attribute.');
    }
    const brands = {
      ...first,
      attributeId: 'SA-20',
      label: 'Brands',
      widgets: first.widgets.map((w) => ({ ...w, filledInPercent: w.filledInPercent && 40 })),
    };
    const { user } = renderReport(planDetails({ attributes: [first, brands] }));
    const nav = await screen.findByRole('navigation', { name: 'Shell attributes' });
    const names = () =>
      within(nav)
        .getAllByRole('button')
        .map((b) => b.textContent);

    expect(names()).toEqual(['Brands 40 % filled in', 'Company code 79 % filled in']);
    expect(screen.getByRole('region', { name: 'Brands' })).toBeInTheDocument();
    await choose(user, within(nav).getByRole('combobox', { name: 'Order' }), 'Settings order');
    expect(names()).toEqual(['Company code 79 % filled in', 'Brands 40 % filled in']);
  });

  it('says "No data yet" when no record of the level is in view, and offers no export (FR-016)', async () => {
    const empty = planDetails({
      cards: {
        records: 0,
        plannedCost: { amount: '0.00', currency: 'EUR' },
        allFilledIn: 0,
        allFilledInPercent: null,
      },
      builtIn: [],
    });
    renderReport(empty);

    expect(await screen.findByText('No data yet')).toBeInTheDocument();
    expect(
      screen.getByText("Activities create this report's data; there are none in view."),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the plans' })).toHaveAttribute('href', '/plans');
    expect(screen.queryByText('By Company code')).not.toBeInTheDocument();
  });

  it('says the filters exclude every record of the level, and resets them (FR-016)', async () => {
    const empty = planDetails({
      cards: {
        records: 0,
        plannedCost: { amount: '0.00', currency: 'EUR' },
        allFilledIn: 0,
        allFilledInPercent: null,
      },
      builtIn: [],
    });
    const { user } = renderReport(empty, undefined, '/reports/plan-data?activityStatus=declined');

    expect(await screen.findByText('Your filters exclude everything')).toBeInTheDocument();
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
    const reset = screen.getAllByRole('button', { name: 'Reset filters' }).at(-1);
    if (!reset) {
      throw new Error('No Reset filters button.');
    }
    await user.click(reset);
    expect(await screen.findByText('No data yet')).toBeInTheDocument();
  });

  it('says when no attribute of the level is set up (FR-016)', async () => {
    renderReport(planDetails({ attributes: [], attributesSetUp: false }));

    expect(
      await screen.findByText('No activity attributes are set up in Settings.'),
    ).toBeInTheDocument();
  });

  it('asks the API for the level chosen (FR-001)', async () => {
    const api = renderReport();
    await screen.findByText('By Company code');

    await api.user.click(screen.getByRole('button', { name: 'Campaign' }));

    await waitFor(() =>
      expect(
        api.requests.filter((r) => r.path === '/api/v1/reports/plan-details').at(-1)?.search,
      ).toContain('show=campaign'),
    );
  });

  it('opens on the level in the address (FR-001)', async () => {
    renderReport(
      planDetails({ show: 'campaign', builtIn: [], attributes: [], attributesSetUp: false }),
      undefined,
      '/reports/plan-data?show=campaign',
    );

    expect(
      await screen.findByText('No campaign attributes are set up in Settings.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Campaign' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
