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
  it('writes the search onto the list, never onto the page a link opens before it settles (004 FR-001, FR-003)', async () => {
    mockApi([reply('GET /api/v1/plans', { body: seedList() })]);
    // Mounted on every path, as the list stays on screen while the next page's code loads.
    const { router } = renderWithProviders(<PlansPage />, {
      user: testUser(),
      route: '/plans',
      path: '*',
    });
    const box = await screen.findByRole('searchbox', { name: 'Search plans' });
    await screen.findAllByRole('article');
    vi.useFakeTimers();

    const plan = nth(
      screen
        .getAllByRole('link', { name: /.+/ })
        .filter((a) => /\/plans\/P-\d+$/.test(a.getAttribute('href') ?? '')),
      0,
    );
    fireEvent.change(box, { target: { value: 'Core plan' } });
    // A pointer on the link takes the focus from the box first, which settles the search.
    fireEvent.blur(box);
    fireEvent.click(plan);
    await act(() => router.navigate(plan.getAttribute('href') ?? ''));
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(router.state.location.pathname).toBe(plan.getAttribute('href'));
    expect(router.state.location.search).toBe('');
  });
});
