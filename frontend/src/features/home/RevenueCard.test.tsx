import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { summaryReport } from '@/testing/fixtures/summary';
import { testUser } from '@/testing/fixtures/users';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { RevenueCard } from './RevenueCard';

function renderCard(
  answer: Answer<'GET /api/v1/reports/summary'> = { body: summaryReport() },
  user = testUser(),
) {
  const api = mockApi([
    reply('GET /api/v1/reports/summary', answer),
    reply('GET /api/v1/me', { body: user }),
  ]);
  renderWithProviders(<RevenueCard />, { user });
  return api;
}

describe('Home: Revenue this year', () => {
  it('shows revenue against goal and the performance with its variance, linking to the Summary report', async () => {
    renderCard();

    const card = await screen.findByRole('region', { name: 'Revenue this year' });
    expect(await within(card).findByText('$1,200.00')).toBeInTheDocument();
    expect(within(card).getByText('$10,000.00')).toBeInTheDocument();
    expect(within(card).getByText('12%')).toBeInTheDocument();
    expect(within(card).getByText('Below plan')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Open Performance report' })).toHaveAttribute(
      'href',
      '/reports/performance',
    );
  });

  it('is left out for a person who may not see reports, without asking the API', () => {
    const api = renderCard(
      undefined,
      testUser({
        access: { roles: [], permissions: [], administrators: [], noSelfApproval: true },
      }),
    );

    expect(screen.queryByRole('region', { name: 'Revenue this year' })).not.toBeInTheDocument();
    expect(api.requests).toHaveLength(0);
  });

  it('is left out when the API refuses the report', async () => {
    const api = renderCard({ status: 403, body: apiError('forbidden', 'Not allowed.') });

    await vi.waitFor(() =>
      expect(api.requests.map((request) => request.path)).toContain('/api/v1/reports/summary'),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Revenue this year' })).not.toBeInTheDocument(),
    );
  });
});
