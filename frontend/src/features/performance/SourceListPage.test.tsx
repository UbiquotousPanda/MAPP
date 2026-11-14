import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { components } from '@/api/generated/schema';
import { expectNoAxeViolations } from '@/testing/axe';
import { testUser } from '@/testing/fixtures/users';
import { VIEWER } from '@/testing/fixtures/viewer';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, pending, reply } from '@/testing/replies';
import { SourceListPage } from './SourceListPage';

const LIST = 'GET /api/v1/performance/sources';

function source(
  overrides: Partial<components['schemas']['PerformanceSource']> = {},
): components['schemas']['PerformanceSource'] {
  return {
    id: 'PS-1001',
    name: 'Adobe Analytics',
    description: '',
    ownerId: 'U-1001',
    category: 'webAnalytics',
    status: 'active',
    deliveryRoute: 'upload',
    cadence: 'weekly',
    integrationId: '',
    freshness: 'current',
    lastLoadedAt: '2026-10-28T09:00:00Z',
    dataThrough: '2026-10-27',
    factCount: 120,
    version: 1,
    createdAt: '2026-10-01T09:00:00Z',
    createdBy: { id: 'U-1001', name: 'Alex Morgan' },
    updatedAt: '2026-10-01T09:00:00Z',
    updatedBy: { id: 'U-1001', name: 'Alex Morgan' },
    ...overrides,
  };
}

function renderPage(handlers: Parameters<typeof mockApi>[0], user = testUser()) {
  const api = mockApi(handlers);
  return { api, ...renderWithProviders(<SourceListPage />, { user }) };
}

type Sources = { items: ReturnType<typeof source>[] };

function listing(body: Sources) {
  return reply(LIST, { body });
}

describe('SourceListPage', () => {
  it('046 FR-001 FR-005 lists every source with its derived freshness', async () => {
    renderPage([
      listing({
        items: [
          source(),
          source({
            id: 'PS-1002',
            name: 'Marketo',
            category: 'marketingAutomation',
            freshness: 'stale',
            lastLoadedAt: null,
          }),
        ],
      }),
    ]);

    expect(await screen.findByRole('cell', { name: 'Adobe Analytics' })).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Never' })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('046 FR-001 shows when a source last loaded as a date and time', async () => {
    renderPage([listing({ items: [source()] })]);

    expect(
      await screen.findByRole('cell', { name: /^28 Oct 2026, \d{2}:\d{2}$/ }),
    ).toBeInTheDocument();
  });

  it('046 FR-001 shows the empty state before any source exists', async () => {
    renderPage([listing({ items: [] })]);

    expect(await screen.findByText('No data sources yet')).toBeInTheDocument();
  });

  it('046 FR-001 shows the error state with a retry when the list fails', async () => {
    renderPage([
      reply(LIST, { status: 500, body: apiError('internal_error', 'Something went wrong.') }),
    ]);

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('046 FR-001 shows a loading skeleton while the list is on its way', () => {
    renderPage([reply(LIST, () => pending())]);

    expect(screen.getByRole('heading', { name: 'Performance data' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('046 FR-043 someone without performance.import reads the sources with the view-only note and no changes', async () => {
    renderPage([listing({ items: [source()] })], VIEWER);

    expect(await screen.findByRole('cell', { name: 'Adobe Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/View only/);
    expect(screen.queryByRole('button', { name: 'New data source' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Imports' })).not.toBeInTheDocument();
  });
});
