import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { FilterBar } from './FilterBar';
import type { FilterBarProps } from './FilterBar';

const MENUS = <button type="button">Owner</button>;

function renderBar(props: Partial<FilterBarProps> = {}) {
  const onClearFilters = vi.fn();
  const onRemoveChip = vi.fn();
  render(
    <FilterBar
      search={<input type="search" aria-label="Search plans" />}
      menus={MENUS}
      chips={[]}
      onRemoveChip={onRemoveChip}
      onClearFilters={onClearFilters}
      {...props}
    />,
  );
  return { onClearFilters, onRemoveChip };
}

describe('FilterBar', () => {
  it('keeps the filter menus folded away while no filter is in use, and Filters folds them out', async () => {
    const user = userEvent.setup();
    renderBar();
    const filters = screen.getByRole('button', { name: 'Filters' });
    expect(filters).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Filters' })).not.toBeInTheDocument();

    await user.click(filters);

    expect(filters).toHaveAttribute('aria-expanded', 'true');
    const group = screen.getByRole('group', { name: 'Filters' });
    expect(filters).toHaveAttribute('aria-controls', group.id);
    expect(screen.getByRole('button', { name: 'Owner' })).toBeVisible();
    await expectNoAxeViolations();
  });

  it('starts folded out, counting the filters in use, when the page opens with filters', () => {
    renderBar({ inUse: 2, chips: [{ key: 'owner', label: 'Owner: Priya Raman' }] });

    expect(screen.getByRole('button', { name: 'Filters (2)' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('group', { name: 'Filters' })).toBeVisible();
  });

  it('folds out when filters come into use from elsewhere, such as a link', () => {
    const props = { chips: [], onRemoveChip: vi.fn(), onClearFilters: vi.fn(), menus: MENUS };
    const { rerender } = render(<FilterBar {...props} />);

    rerender(<FilterBar {...props} inUse={1} />);

    expect(screen.getByRole('button', { name: 'Filters (1)' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows the filters in use as chips with Clear filters', async () => {
    const user = userEvent.setup();
    const { onClearFilters } = renderBar({
      inUse: 1,
      chips: [{ key: 'owner', label: 'Owner: Priya Raman' }],
    });

    expect(screen.getByRole('button', { name: 'Remove filter: Owner: Priya Raman' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('has no Filters button on a list whose only filter is its quick control', () => {
    renderBar({ menus: undefined, quick: <button type="button">Active</button> });

    expect(screen.queryByRole('button', { name: /^Filters/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
  });
});
