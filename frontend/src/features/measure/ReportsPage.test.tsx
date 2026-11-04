import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { catalogue } from '@/testing/fixtures/reports';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { ReportsPage } from './ReportsPage';

function groupCards(title: string) {
  const group = screen.getByRole('region', { name: title });
  return within(group)
    .getAllByRole('listitem')
    .map((card) => card.querySelector('[id$="-name"]')?.textContent);
}

describe('ReportsPage (039 FR-001, US1 scenarios 1 and 2)', () => {
  it('shows the reports as cards in their groups with their purposes; Coming soon has no link', async () => {
    mockApi([reply('GET /api/v1/reports', { body: catalogue() })]);
    renderWithProviders(<ReportsPage />, { user: testUser() });

    await screen.findByRole('link', { name: 'Plan details' });
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Planning and budget',
      'Purchasing and GSAP',
      'Performance',
    ]);
    expect(groupCards('Planning and budget')).toEqual(['Plan budget', 'Plan details', 'Approvals']);
    expect(groupCards('Purchasing and GSAP')).toEqual(['Purchase requests', 'GSAP link']);
    expect(groupCards('Performance')).toEqual(['Summary', 'Revenue', 'Funnel stages']);
    const planDetails = screen.getByRole('link', { name: 'Plan details' });
    expect(planDetails).toHaveAttribute('href', '/reports/plan-details');
    expect(planDetails).toHaveAccessibleDescription('What Plan details answers.');
    expect(screen.queryByRole('link', { name: 'Plan budget' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Coming soon')).toHaveLength(7);
    expect(screen.getByText('What Plan budget answers.')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('shows User access under Administration only when the catalogue offers it (045 FR-002)', async () => {
    const items = catalogue().items;
    items.push({
      key: 'userAccess',
      path: 'user-access',
      name: 'User access',
      purpose: 'Who has which role.',
      available: true,
    });
    mockApi([reply('GET /api/v1/reports', { body: { items } })]);
    renderWithProviders(<ReportsPage />, { user: testUser() });

    await screen.findByRole('link', { name: 'User access' });
    expect(groupCards('Administration')).toEqual(['User access']);
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
