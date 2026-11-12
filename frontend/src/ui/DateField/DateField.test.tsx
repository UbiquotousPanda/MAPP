import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { DateField } from './DateField';
import type { DateFieldProps } from './DateField';

function Bound(props: Omit<DateFieldProps, 'value' | 'onChange'>) {
  const [value, setValue] = useState('');
  return (
    <>
      <DateField {...props} value={value} onChange={setValue} />
      <p>chosen: {value}</p>
    </>
  );
}

describe('DateField', () => {
  it('is a required form field whose note and problem are heard with it', async () => {
    renderWithProviders(
      <Bound
        name="rate-date"
        label="Date"
        marking="Required"
        note="The rate counts from this date."
        error="Choose a date."
      />,
    );

    const date = screen.getByLabelText(/^Date/);
    expect(date).toHaveAttribute('id', 'rate-date');
    expect(date).toBeRequired();
    expect(date).toBeInvalid();
    expect(date).toHaveAccessibleDescription(/The rate counts from this date\. .*Choose a date\./);
    await expectNoAxeViolations();
  });

  it('reports the typed date in a filter bar, with its problem announced', async () => {
    const { user } = renderWithProviders(
      <Bound label="To" compact min="2026-03-01" error="To can't be before From." />,
    );

    const to = screen.getByLabelText('To');
    expect(to).toHaveAttribute('min', '2026-03-01');
    expect(screen.getByRole('alert')).toHaveTextContent("To can't be before From.");
    await user.type(to, '2026-03-12');

    expect(screen.getByText('chosen: 2026-03-12')).toBeInTheDocument();
    await expectNoAxeViolations();
  });
});
