import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { reportFrame } from '@/testing/fixtures/reports';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { choose } from '@/testing/select';
import { PeriodSwitch } from './ReportControls';
import { ReportFrame } from './ReportFrame';

type Frame = ReturnType<typeof reportFrame>;

function renderFrame(frame: Frame | 'forbidden', route = '/reports/plan-budget') {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply(
      'GET /api/v1/reports/frame',
      frame === 'forbidden'
        ? { status: 403, body: apiError('forbidden', "Seeing reports isn't part of your role.") }
        : { body: frame },
    ),
  ]);
  const rendered = renderWithProviders(
    <ReportFrame report="planBudget">
      {() => (
        <>
          <PeriodSwitch />
          <p>The widgets</p>
        </>
      )}
    </ReportFrame>,
    { route, user: testUser(), path: '/reports/plan-budget' },
  );
  return { ...rendered, api };
}

const search = (router: { state: { location: { search: string } } }) =>
  new URLSearchParams(router.state.location.search);

describe('ReportFrame (039 FR-006 – FR-019, FR-031)', () => {
  it('shows the header, In view, the controls and the widgets', async () => {
    renderFrame(reportFrame());

    expect(
      await screen.findByText(
        'In view: 2 plans · 6 campaigns · 2 initiatives · 14 activities · 30 line items',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Plan budget' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    expect(screen.getByText(/2026 · Figures as of/)).toBeInTheDocument();
    expect(screen.getByText('The widgets')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('names each restricted filter as a chip; removing one or Clear filters applies at once (FR-014)', async () => {
    const frame = reportFrame({ filter: { ...reportFrame().filter, plans: ['P-1001'] } });
    const { user, router } = renderFrame(
      frame,
      '/reports/plan-budget?plan=P-1001&planType=operational',
    );

    await user.click(
      await screen.findByRole('button', { name: 'Remove filter: Plans: FY2026 Lubricants' }),
    );
    await waitFor(() => expect(search(router).getAll('plan')).toEqual([]));
    expect(search(router).get('planType')).toBe('operational');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(search(router).toString()).toBe(''));
  });

  it('changes the year at once, saying first that it clears the chosen plans (FR-011, FR-013)', async () => {
    const { user, router } = renderFrame(
      reportFrame({ filter: { ...reportFrame().filter, plans: ['P-1001'] } }),
      '/reports/plan-budget?plan=P-1001',
    );
    const year = await screen.findByRole('combobox', { name: /Year/ });
    expect(year).toHaveAccessibleDescription('Another year clears the plan you chose.');

    await choose(user, year, '2025');

    await waitFor(() => expect(search(router).get('year')).toBe('2025'));
    expect(search(router).getAll('plan')).toEqual([]);
  });

  it("applies a widget's Period at once, and has no currency of its own (FR-016, FR-018, 039-C10)", async () => {
    const { user, router } = renderFrame(reportFrame(), '/reports/plan-budget?currency=EUR');

    await user.click(await screen.findByRole('button', { name: 'Quarters' }));

    await waitFor(() => expect(search(router).get('period')).toBe('quarter'));
    expect(search(router).get('currency')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Currency' })).not.toBeInTheDocument();
  });

  it('says how many values were left out, never naming them (FR-015)', async () => {
    renderFrame(reportFrame({ leftOut: 2 }), '/reports/plan-budget?plan=P-9999');

    expect(
      await screen.findByText('2 filter values are no longer available and were left out'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/P-9999/)).not.toBeInTheDocument();
  });

  const empty = { plans: 0, campaigns: 0, initiatives: 0, activities: 0, lineItems: 0 };

  it('says there are no plans to see for the year, naming the years that have some (FR-031)', async () => {
    renderFrame(reportFrame({ inView: empty }));

    expect(await screen.findByText('No plans you may see for 2026')).toBeInTheDocument();
    expect(screen.getByText('There are plans for 2025.')).toBeInTheDocument();
  });

  it('says the filters exclude everything, with Clear filters (FR-031)', async () => {
    renderFrame(reportFrame({ inView: empty }), '/reports/plan-budget?planType=crossMarket');

    expect(await screen.findByText('Your filters exclude everything')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear filters' }).length).toBeGreaterThan(0);
  });

  it('says there are no plans for the year before blaming the filters (FR-031)', async () => {
    const frame = reportFrame({ inView: empty });
    renderFrame(
      { ...frame, choices: { ...frame.choices, plans: [] } },
      '/reports/plan-budget?planType=crossMarket',
    );

    expect(await screen.findByText('No plans you may see for 2026')).toBeInTheDocument();
    expect(screen.queryByText('Your filters exclude everything')).not.toBeInTheDocument();
  });

  it("says when none of the figures' plans may be seen (FR-004)", async () => {
    renderFrame(reportFrame({ finance: { plans: 0, of: 2 } }));

    expect(
      await screen.findByText("You can't see the financial data of these plans"),
    ).toBeInTheDocument();
  });

  it("keeps the report's own parameters when a control changes (039 B4)", async () => {
    const { user, router } = renderFrame(
      reportFrame(),
      '/reports/plan-budget?tab=waiting&sort=age',
    );

    await user.click(await screen.findByRole('button', { name: 'Quarters' }));

    await waitFor(() => expect(search(router).get('period')).toBe('quarter'));
    expect(search(router).get('tab')).toBe('waiting');
    expect(search(router).get('sort')).toBe('age');
  });

  it('shows the standard no-access page without "See reports"', async () => {
    renderFrame('forbidden');

    expect(await screen.findByRole('heading', { name: /access/i })).toBeInTheDocument();
  });
});
