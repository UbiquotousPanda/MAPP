import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { BarList } from './BarList';

const WEEK = { key: 'week', label: 'This week', value: '6', size: 6 };
const MONTH = { key: 'month', label: 'This month', value: '3', size: 3 };
const BANDS = [WEEK, MONTH, { key: 'never', label: 'Never', value: '0', size: 0 }];

function fillOf(row: HTMLElement | undefined) {
  return row?.querySelector('[aria-hidden="true"] > span');
}

describe('BarList', () => {
  it('writes each label and figure, the largest bar full and the others in proportion', async () => {
    renderWithProviders(<BarList label="People by last sign-in" items={BANDS} />);

    const rows = within(screen.getByRole('list', { name: 'People by last sign-in' })).getAllByRole(
      'listitem',
    );
    expect(rows.map((row) => row.textContent)).toEqual(['This week6', 'This month3', 'Never0']);
    expect(fillOf(rows[0])).toHaveStyle({ width: '100%' });
    expect(fillOf(rows[1])).toHaveStyle({ width: '50%' });
    expect(fillOf(rows[2])).toHaveStyle({ width: '0%' });
    await expectNoAxeViolations();
  });

  it('measures shares against the max it is given, and never draws past a full bar', () => {
    renderWithProviders(
      <BarList
        label="Status"
        max={100}
        items={[
          { key: 'a', label: 'Approved', value: '1 · 25 %', size: 25 },
          { key: 'b', label: 'Odd', value: '?', size: 140 },
        ]}
      />,
    );

    const [approved, odd] = screen.getAllByRole('listitem');
    expect(fillOf(approved)).toHaveStyle({ width: '25%' });
    expect(fillOf(odd)).toHaveStyle({ width: '100%' });
  });

  it('makes a row with an address a link named by its label', async () => {
    const { user } = renderWithProviders(
      <BarList label="Spend" items={[{ ...WEEK, href: '/all-work' }, MONTH]} />,
      { path: '/' },
    );

    await user.click(screen.getByRole('link', { name: 'This week' }));

    expect(screen.getByText('Another page')).toBeInTheDocument();
  });
});
