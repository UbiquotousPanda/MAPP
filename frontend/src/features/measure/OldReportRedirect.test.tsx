import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoutes } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { OldReportRedirect } from './OldReportRedirect';

describe('OldReportRedirect', () => {
  it('replaces an old report address with its new home (059 FR-009, US3-1)', async () => {
    const { router } = renderRoutes(
      [
        { path: '/reports/revenue', element: <OldReportRedirect /> },
        { path: '/reports/performance', element: <p>Performance</p> },
      ],
      { route: '/reports/revenue?year=2026&group=owner', user: testUser() },
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/reports/performance'));
    expect(router.state.location.search).toBe('?year=2026&group=owner&stage=revenue');
    expect(router.state.historyAction).toBe('REPLACE');
  });
});
