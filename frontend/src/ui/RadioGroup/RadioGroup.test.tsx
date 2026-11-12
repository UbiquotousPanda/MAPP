import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { RadioGroup } from './RadioGroup';
import type { RadioOption } from './RadioGroup';

const MODES: RadioOption<string>[] = [
  { value: 'warn', label: 'Warn', hint: 'Saving goes ahead with a warning.' },
  { value: 'refuse', label: 'Refuse', hint: 'Saving is refused.' },
  { value: 'next', label: 'Next year (2027)', disabledReason: 'A 2027 plan already exists.' },
];

function Bound({ disabledReason, error }: { disabledReason?: string; error?: string }) {
  const [value, setValue] = useState('warn');
  return (
    <>
      <RadioGroup
        label="If planned cost exceeds the budget"
        name="overspend"
        options={MODES}
        value={value}
        onChange={setValue}
        disabledReason={disabledReason}
        error={error}
      />
      <p>chosen: {value}</p>
    </>
  );
}

describe('RadioGroup', () => {
  it('is a named group whose options carry their hints, and arrows change the choice', async () => {
    const { user } = renderWithProviders(<Bound />);

    const group = screen.getByRole('group', { name: 'If planned cost exceeds the budget' });
    expect(group).toHaveAttribute('id', 'overspend');
    const warn = screen.getByRole('radio', { name: 'Warn' });
    expect(warn).toBeChecked();
    expect(warn).toHaveAccessibleDescription('Saving goes ahead with a warning.');

    await user.click(warn);
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('radio', { name: 'Refuse' })).toBeChecked();
    expect(screen.getByText('chosen: refuse')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('locks one option with its reason', () => {
    renderWithProviders(<Bound />);

    const next = screen.getByRole('radio', { name: 'Next year (2027)' });
    expect(next).toBeDisabled();
    expect(next).toHaveAccessibleDescription('A 2027 plan already exists.');
  });

  it('locks the whole group with its reason, and describes its problem', () => {
    renderWithProviders(
      <Bound disabledReason="Only administrators change this." error="Choose one." />,
    );

    expect(screen.getByRole('radio', { name: 'Warn' })).toBeDisabled();
    expect(screen.getByRole('group')).toHaveAccessibleDescription(
      /Only administrators change this\..*Choose one\./,
    );
  });
});
