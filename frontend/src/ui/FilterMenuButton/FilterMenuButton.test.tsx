import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { FilterMenuButton, FiltersButton } from './FilterMenuButton';

describe('FilterMenuButton', () => {
  it('is named by the filter alone while it is not in use', async () => {
    render(<FilterMenuButton label="Owner" />);

    expect(screen.getByRole('button', { name: 'Owner' })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('adds what is chosen to its name while it is in use', () => {
    render(<FilterMenuButton label="Owner" summary="2" />);

    expect(screen.getByRole('button', { name: 'Owner · 2' })).toBeInTheDocument();
  });

  it('is "Filters", and says how many are in use', async () => {
    const { rerender } = render(<FiltersButton count={0} />);
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();

    rerender(<FiltersButton count={2} />);

    expect(screen.getByRole('button', { name: 'Filters (2)' })).toBeInTheDocument();
    await expectNoAxeViolations();
  });
});
