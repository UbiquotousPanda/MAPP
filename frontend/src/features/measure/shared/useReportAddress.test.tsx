import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useSearchParams } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useReportAddress } from './useReportAddress';

function renderOn(search: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[`/reports/approvals?${search}`]}>{children}</MemoryRouter>
  );
  return renderHook(() => ({ address: useReportAddress(), params: useSearchParams()[0] }), {
    wrapper,
  });
}

describe('useReportAddress', () => {
  it('039 FR-015: a changed filter sends the report back to its first page and keeps its own tab', () => {
    const { result } = renderOn('year=2026&tab=grid&page=3');
    const [address, write] = result.current.address;

    act(() => write({ ...address, teams: ['T-1'] }));

    expect(result.current.params.get('page')).toBeNull();
    expect(result.current.params.get('tab')).toBe('grid');
    expect(result.current.params.getAll('team')).toEqual(['T-1']);
  });

  it('039 FR-015: switching a widget between chart and table keeps the page, since no row changes', () => {
    const { result } = renderOn('year=2026&page=3');
    const [address, write] = result.current.address;

    act(() => write({ ...address, tables: ['grid'] }));

    expect(result.current.params.get('page')).toBe('3');
  });
});
