import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@/testing/fixtures/activity-categories';
import { TYPES } from '@/testing/fixtures/activity-types';
import { mockApi } from '@/testing/mock-api';
import { renderRoutes } from '@/testing/render';
import { performanceSource } from '@/testing/fixtures/performance';
import { testUser } from '@/testing/fixtures/users';
import { VIEWER } from '@/testing/fixtures/viewer';
import { reply } from '@/testing/replies';
import '@/testing/pages';
import { routes } from './routes';

// A real defect: the card at Settings › Activity categories had no matching route, so it led to Not found.
describe('settings routes', () => {
  it('opens Activity categories, not the not-found page (047)', async () => {
    mockApi([
      reply('GET /api/v1/me', { body: testUser() }),
      reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
      reply('GET /api/v1/activity-types', { body: TYPES }),
    ]);

    renderRoutes(routes, { route: '/settings/activity-categories', user: testUser() });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Activity categories' }),
    ).toBeVisible();
    expect(screen.queryByText(/doesn.t exist/i)).not.toBeInTheDocument();
  });

  it('046 FR-001 the Performance data card opens the data sources, not the not-found page', async () => {
    mockApi([
      reply('GET /api/v1/me', { body: testUser() }),
      reply('GET /api/v1/performance/sources', { body: { items: [performanceSource()] } }),
    ]);

    renderRoutes(routes, { route: '/settings/performance-data', user: testUser() });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Performance data' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Imports' })).toHaveAttribute(
      'href',
      '/settings/performance-data/imports',
    );
  });

  it('046 FR-043 Imports and Rows to review show No access to someone without performance.import', async () => {
    mockApi([reply('GET /api/v1/me', { body: VIEWER })]);

    renderRoutes(routes, { route: '/settings/performance-data/review', user: VIEWER });

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeVisible();
  });
});
