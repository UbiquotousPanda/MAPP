import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { NumberField } from './NumberField';

function Width({ start, error }: { start: number; error?: string }) {
  const [value, setValue] = useState(start);
  return (
    <NumberField
      label="Width"
      name="width"
      value={value}
      min={1}
      max={3}
      error={error}
      onChange={setValue}
    />
  );
}

describe('NumberField', () => {
  it('is named by its label and carries its bounds', () => {
    render(<Width start={2} />);

    const field = screen.getByRole('spinbutton', { name: 'Width' });
    expect(field).toHaveValue(2);
    expect(field).toHaveAttribute('min', '1');
    expect(field).toHaveAttribute('max', '3');
  });

  it('steps with the arrow keys and stops at its bounds', async () => {
    const user = userEvent.setup();
    render(<Width start={2} />);
    const field = screen.getByRole('spinbutton', { name: 'Width' });

    await user.click(field);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(field).toHaveValue(3);

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(field).toHaveValue(1);
  });

  it('shows an empty field while nothing is typed', async () => {
    const user = userEvent.setup();
    render(<Width start={2} />);
    const field = screen.getByRole('spinbutton', { name: 'Width' });

    await user.clear(field);

    expect(field).toHaveValue(null);
  });

  it('marks a problem and reads it out with the field', () => {
    render(<Width start={9} error="Use 1 to 3." />);

    const field = screen.getByRole('spinbutton', { name: 'Width' });
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription('Use 1 to 3.');
  });
});
