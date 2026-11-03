import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nth } from '@/testing/dom';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { seedList } from '@/testing/fixtures/plans';
import { reply } from '@/testing/replies';
import { PlansPage } from './PlansPage';

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('PlansPage search', () => {
  it('leaves the address alone once the person has moved on before the search settles (004 FR-001, FR-003)', async () => {
    mockApi([reply('GET /api/v1/plans', { body: seedList() })]);
    // Mounted on every path, as the list stays on screen while the next page's code loads.
    const { router } = renderWithProviders(<PlansPage />, {
      user: testUser(),
      route: '/plans',
      path: '*',
    });
    const box = await screen.findByRole('searchbox', { name: 'Search plans' });
    vi.useFakeTimers();

    fireEvent.change(box, { target: { value: 'Core plan' } });
    const plan = nth(
      screen
        .getAllByRole('link', { name: /.+/ })
        .filter((a) => /\/plans\/P-\d+$/.test(a.getAttribute('href') ?? '')),
      0,
    );
    fireEvent.click(plan);
    await act(() => router.navigate(plan.getAttribute('href') ?? ''));
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(router.state.location.pathname).toBe(plan.getAttribute('href'));
    expect(router.state.location.search).toBe('');
  });
});
