import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { SortHeader } from './SortHeader';
import type { SortDirection } from './SortHeader';
import { nextSortOrder } from './sort-order';

function renderHeader(direction?: SortDirection) {
  const onSort = vi.fn();
  render(
    <table>
      <thead>
        <tr>
          <SortHeader label="Amount" direction={direction} onSort={onSort} />
        </tr>
      </thead>
    </table>,
  );
  return { user: userEvent.setup(), onSort };
}

describe('SortHeader', () => {
  it('sorts when its button is pressed', async () => {
    const { user, onSort } = renderHeader();

    await user.click(screen.getByRole('button', { name: 'Amount' }));

    expect(onSort).toHaveBeenCalledOnce();
  });

  it.each([
    [undefined, 'none'],
    ['asc', 'ascending'],
    ['desc', 'descending'],
  ] as const)('tells screen readers the column order (%s)', async (direction, ariaSort) => {
    renderHeader(direction);

    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute(
      'aria-sort',
      ariaSort,
    );
    await expectNoAxeViolations();
  });

  it.each([
    [true, 'asc', 'desc'],
    [true, 'desc', 'asc'],
    [false, 'desc', 'asc'],
  ] as const)('a click on a column sorted=%s %s sorts it %s', (sorted, order, next) => {
    expect(nextSortOrder(sorted, order)).toBe(next);
  });
});
