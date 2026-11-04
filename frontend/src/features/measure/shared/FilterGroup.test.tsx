import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { FilterGroup } from './FilterGroup';
import type { Ticked } from './filter-keys';

const OPTIONS = Array.from({ length: 7 }, (_, i) => ({
  id: `V-${String(i)}`,
  label: `Value ${String(i)}`,
}));

function renderGroup(ticked: Ticked = null, defaultOpen = false) {
  const onChange = vi.fn();
  const rendered = renderWithProviders(
    <FilterGroup
      groupKey="brand"
      title="Brand"
      options={OPTIONS}
      ticked={ticked}
      defaultOpen={defaultOpen}
      onChange={onChange}
    />,
  );
  return { ...rendered, onChange };
}

afterEach(() => {
  localStorage.clear();
});

describe('FilterGroup (039-C9, FR-010)', () => {
  it('starts folded with its summary, and unfolds and folds from its header', async () => {
    const { user } = renderGroup();
    const header = screen.getByRole('button', { name: 'Brand All' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(header);

    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    await expectNoAxeViolations();
    await user.click(header);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('says what is chosen: the one value, or n of m, and opens when it restricts', () => {
    renderGroup(['V-2']);
    const header = screen.getByRole('button', { name: 'Brand Value 2' });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(header).toContainElement(screen.getByTitle('Value 2'));

    cleanup();
    renderGroup(['V-1', 'V-3']);

    expect(screen.getByRole('button', { name: 'Brand 2 of 7' })).toBeInTheDocument();
  });

  it('lists five values, then See more (n) and See less', async () => {
    const { user } = renderGroup(null, true);
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: 'See more (2)' }));

    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    await user.click(screen.getByRole('button', { name: 'See less' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
  });

  it('remembers in this browser whether the viewer folded it', async () => {
    const { user } = renderGroup(null, true);
    await user.click(screen.getByRole('button', { name: 'Brand All' }));

    cleanup();
    renderGroup(null, true);

    expect(screen.getByRole('button', { name: 'Brand All' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens itself while nothing is ticked, even when the viewer had folded it', async () => {
    const { user } = renderGroup(null, true);
    await user.click(screen.getByRole('button', { name: 'Brand All' }));

    cleanup();
    renderGroup([]);

    expect(screen.getByRole('button', { name: 'Brand 0 of 7' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
  });
});
