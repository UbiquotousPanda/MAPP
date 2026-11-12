import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useAddressParams } from './useAddressParams';
import { useListFilters } from './useListFilters';

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/list?year=2026']}>{children}</MemoryRouter>
);

describe('writing the address (D-424)', () => {
  it('applies two quick changes each to the latest address, so both survive', () => {
    const { result } = renderHook(() => useAddressParams(), { wrapper });
    const [, set] = result.current;

    act(() => {
      set((latest) => ({ ...Object.fromEntries(latest), q: 'film' }));
      set((latest) => ({ ...Object.fromEntries(latest), status: 'all' }));
    });

    expect(result.current[0].toString()).toBe('year=2026&q=film&status=all');
  });

  it('keeps a Settings list’s search when its status changes at once after it', () => {
    const { result } = renderHook(() => useListFilters(), { wrapper });
    const { setQ, setStatus } = result.current;

    act(() => {
      setQ('lubricants');
      setStatus('inactive');
    });

    expect(result.current.q).toBe('lubricants');
    expect(result.current.status).toBe('inactive');
  });
});
