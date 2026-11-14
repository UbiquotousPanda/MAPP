import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useUrlFilters } from './useUrlFilters';

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/performance']}>{children}</MemoryRouter>
);

describe('useUrlFilters', () => {
  it('keeps both of two filters chosen one right after the other (D-424)', () => {
    const { result } = renderHook(() => useUrlFilters(['source', 'status']), { wrapper });
    const { set } = result.current;

    act(() => {
      set('source', 'S-1');
      set('status', 'held');
    });

    expect(result.current.values).toEqual({ source: 'S-1', status: 'held' });
  });
});
