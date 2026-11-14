import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { SegmentedFilter } from './SegmentedFilter';

type Status = 'active' | 'inactive' | 'all';

function Example() {
  const [status, setStatus] = useState<Status>('active');
  return (
    <>
      <SegmentedFilter
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'active', label: 'Active', count: 5 },
          { value: 'inactive', label: 'Inactive', count: 1217 },
          { value: 'all', label: 'All' },
        ]}
      />
      <p>Showing {status}</p>
    </>
  );
}

describe('SegmentedFilter', () => {
  it('is a named group of pills; the chosen one is pressed (design system §6.1)', () => {
    renderWithProviders(<Example />);

    const group = screen.getByRole('group', { name: 'Status' });
    expect(within(group).getByRole('button', { name: 'Active 5' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(group).getByRole('button', { name: 'Inactive 1,217' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(within(group).getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('reports the choice', async () => {
    const { user } = renderWithProviders(<Example />);

    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByText('Showing all')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls a chosen pill hidden past the edge of a narrow row into view', async () => {
    const { user } = renderWithProviders(<Example />);
    const group = screen.getByRole('group', { name: 'Status' });
    let scrollLeft = 0;
    Object.defineProperty(group, 'scrollLeft', {
      get: () => scrollLeft,
      set: (next: number) => {
        scrollLeft = next;
      },
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect(
      this: Element,
    ) {
      const [left, right] =
        this === group ? [0, 200] : this.textContent === 'All' ? [240, 280] : [0, 80];
      return DOMRect.fromRect({ x: left - scrollLeft, width: right - left, height: 32 });
    });

    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(scrollLeft).toBe(280 - 200 + 32);
  });
});
