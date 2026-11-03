import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@/testing/fixtures/activity-categories';
import { TYPES } from '@/testing/fixtures/activity-types';
import { mockApi } from '@/testing/mock-api';
import { renderRoutes } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
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
});
