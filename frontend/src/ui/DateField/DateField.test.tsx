import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { DateField } from './DateField';
import type { DateFieldProps } from './DateField';

function Bound({
  initial = '',
  ...props
}: Omit<DateFieldProps, 'value' | 'onChange'> & { initial?: string }) {
  const [value, setValue] = useState(initial);
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
        initial="2026-03-12"
        note="The rate counts from this date."
        error="Choose a date."
      />,
    );

    const date = screen.getByRole('textbox', { name: /^Date/ });
    expect(date).toHaveAttribute('id', 'rate-date');
    expect(date).toHaveValue('12 Mar 2026');
    expect(date).toBeRequired();
    expect(date).toBeInvalid();
    expect(date).toHaveAccessibleDescription(/The rate counts from this date\. .*Choose a date\./);
    expect(document.querySelector('input[type="hidden"][name="rate-date"]')).toHaveValue(
      '2026-03-12',
    );
    await expectNoAxeViolations();
  });

  it.each([
    ['12 Mar 2026', '2026-03-12'],
    ['12/03/2026', '2026-03-12'],
    ['2026-03-12', '2026-03-12'],
  ])(
    'reads "%s" as %s and shows it in the person’s format once left (D-424)',
    async (text, iso) => {
      const { user } = renderWithProviders(<Bound label="To" compact />);

      await user.type(screen.getByRole('textbox', { name: 'To' }), text);
      expect(screen.getByText(`chosen: ${iso}`)).toBeInTheDocument();
      await user.tab();

      expect(screen.getByRole('textbox', { name: 'To' })).toHaveValue('12 Mar 2026');
    },
  );

  it('says what is wrong with a typed date that is not one, and keeps no date (D-424)', async () => {
    const { user } = renderWithProviders(<Bound label="To" compact initial="2026-03-01" />);
    const to = screen.getByRole('textbox', { name: 'To' });

    await user.clear(to);
    await user.type(to, '31 Feb 2026');
    await user.tab();

    expect(to).toHaveValue('31 Feb 2026');
    expect(to).toBeInvalid();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a date like 12 Mar 2026.');
    expect(screen.getByText('chosen:')).toBeInTheDocument();
  });
});
