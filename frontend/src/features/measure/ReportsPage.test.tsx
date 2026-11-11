import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { catalogue } from '@/testing/fixtures/reports';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { ReportsPage } from './ReportsPage';

describe('ReportsPage (039 FR-001, 039-C7, US1 scenarios 1 and 2)', () => {
  it('lists the reports by group in order with their purposes; Coming soon has no link', async () => {
    mockApi([reply('GET /api/v1/reports', { body: catalogue() })]);
    renderWithProviders(<ReportsPage />, { user: testUser() });

    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.querySelector('a, span')?.textContent)).toEqual([
      'Summary',
      'Revenue',
      'Funnel stages',
      'Plan budget',
      'Purchase requests',
      'GSAP link',
      'Approvals',
      'Plan details',
    ]);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Performance',
      'Budget and spend',
      'Process and governance',
    ]);
    const performance = screen.getByRole('region', { name: 'Performance' });
    expect(within(performance).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Plan details' })).toHaveAttribute(
      'href',
      '/reports/plan-details',
    );
    expect(screen.queryByRole('link', { name: 'Plan budget' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Coming soon')).toHaveLength(7);
    expect(screen.getByText('What Plan budget answers.')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('explains each report in its ⓘ: what it answers, shows and who it is for (039-C7)', async () => {
    mockApi([reply('GET /api/v1/reports', { body: catalogue() })]);
    renderWithProviders(<ReportsPage />, { user: testUser() });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'About Plan budget' }));

    const tip = screen.getByRole('dialog', { name: 'About Plan budget' });
    expect(tip).toHaveTextContent(/^Are we on budget\?/);
    expect(tip).toHaveTextContent('For planners, team leaders and finance.');
  });

  it('leaves out a group with no report the person may open (039-C7)', async () => {
    const performanceOnly = catalogue();
    performanceOnly.items = performanceOnly.items.filter((item) =>
      ['summary', 'revenue', 'funnel'].includes(item.key),
    );
    mockApi([reply('GET /api/v1/reports', { body: performanceOnly })]);
    renderWithProviders(<ReportsPage />, { user: testUser() });

    expect(await screen.findByRole('heading', { name: 'Performance' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Budget and spend' })).not.toBeInTheDocument();
  });

  it('shows the standard no-access page without "See reports"', async () => {
    mockApi([
      reply('GET /api/v1/me', { body: testUser() }),
      reply('GET /api/v1/reports', {
        status: 403,
        body: apiError('forbidden', "Seeing reports isn't part of your role."),
      }),
    ]);
    renderWithProviders(<ReportsPage />, { user: testUser() });

    expect(await screen.findByRole('heading', { name: /access/i })).toBeInTheDocument();
  });
});
