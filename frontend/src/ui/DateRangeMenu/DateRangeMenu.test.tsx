import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { DateRangeMenu } from './DateRangeMenu';

function Harness({ error }: { error?: string }) {
  const [range, setRange] = useState(['', '']);
  return (
    <DateRangeMenu
      label="Created"
      legend="Created between"
      from={range[0] ?? ''}
      to={range[1] ?? ''}
      error={error}
      onChange={(from, to) => setRange([from, to])}
    />
  );
}

describe('DateRangeMenu', () => {
  it('applies each date at once and names the range on its button', async () => {
    const { user } = renderWithProviders(<Harness />, { user: testUser() });

    await user.click(screen.getByRole('button', { name: 'Created' }));
    await user.type(screen.getByLabelText('From'), '2026-10-01');
    expect(screen.getByRole('button', { name: 'Created · from 01 Oct 2026' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('To'), '2026-10-12');

    expect(
      screen.getByRole('button', { name: 'Created · 01 Oct 2026 – 12 Oct 2026' }),
    ).toBeInTheDocument();
  });

  it('keeps To from going before From: the earlier days are not available (D-424)', async () => {
    const { user } = renderWithProviders(<Harness />, { user: testUser() });

    await user.click(screen.getByRole('button', { name: 'Created' }));
    await user.type(screen.getByRole('textbox', { name: 'From' }), '2026-10-14');
    await user.type(screen.getByRole('textbox', { name: 'To' }), '2026-10-20');
    await user.click(screen.getByRole('button', { name: 'Choose to date' }));
    const calendar = screen.getByRole('dialog', { name: 'Choose to date' });

    expect(
      within(calendar).getByRole('button', { name: 'Tuesday 13 October 2026, not available' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(within(calendar).getByRole('grid')).toHaveAccessibleDescription(
      'Choose a date from 14 Oct 2026 on.',
    );
  });

  it('shows a range error under To, and the button then claims no filter', async () => {
    const { user } = renderWithProviders(
      <Harness error="The end date must be on or after the start date." />,
      {
        user: testUser(),
      },
    );

    await user.click(screen.getByRole('button', { name: 'Created' }));

    expect(screen.getByLabelText('To')).toHaveAccessibleDescription(
      'The end date must be on or after the start date.',
    );
  });
});
