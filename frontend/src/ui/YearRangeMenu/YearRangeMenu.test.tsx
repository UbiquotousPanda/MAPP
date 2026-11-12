import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { choose } from '@/testing/select';
import { YearRangeMenu } from './YearRangeMenu';

function Harness({ maxYears }: { maxYears?: number }) {
  const [range, setRange] = useState<[number | null, number | null]>([null, null]);
  return (
    <YearRangeMenu
      legend="Plans of the years"
      anyYear="All years"
      years={[2025, 2026, 2027]}
      from={range[0]}
      to={range[1]}
      maxYears={maxYears}
      onChange={(from, to) => setRange([from, to])}
    />
  );
}

describe('YearRangeMenu', () => {
  it('offers To once a From year is chosen, moving To along, and names the range on its button', async () => {
    const { user } = renderWithProviders(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Years' }));
    expect(screen.queryByRole('combobox', { name: 'To' })).not.toBeInTheDocument();
    await choose(user, screen.getByRole('combobox', { name: 'From' }), '2026');
    expect(screen.getByRole('button', { name: 'Years · 2026' })).toBeInTheDocument();
    await choose(user, screen.getByRole('combobox', { name: 'To' }), '2027');

    expect(screen.getByRole('button', { name: 'Years · 2026–2027' })).toBeInTheDocument();
    await choose(user, screen.getByRole('combobox', { name: 'From' }), 'All years');
    expect(screen.getByRole('button', { name: 'Years' })).toBeInTheDocument();
  });

  it('offers only the To years that keep the range within the limit', async () => {
    const { user } = renderWithProviders(<Harness maxYears={2} />);

    await user.click(screen.getByRole('button', { name: 'Years' }));
    await choose(user, screen.getByRole('combobox', { name: 'From' }), '2025');
    await user.click(screen.getByRole('combobox', { name: 'To' }));

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '2025',
      '2026',
    ]);
  });
});
