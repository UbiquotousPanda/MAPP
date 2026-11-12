import { fireEvent, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { DateRangeField } from './DateRangeField';
import type { DateRange } from './DateRangeField';

function Example({ start = '', end = '' }: Partial<DateRange>) {
  const [range, setRange] = useState({ start, end });
  return (
    <>
      <DateRangeField
        label="Dates"
        idPrefix="initiative"
        marking="Needed to publish"
        start={range.start}
        end={range.end}
        onChange={setRange}
        allowed={{ start: '2026-02-01', end: '2026-11-30' }}
        allowedHint="Must be inside the campaign's dates (01 Feb – 30 Nov 2026)"
        errors={{ end: 'End date must be on or after the start date (12 Mar 2026).' }}
        warning="This campaign runs outside 2026, the plan's year"
      />
      <p>
        range: {range.start}…{range.end}
      </p>
    </>
  );
}

describe('DateRangeField', () => {
  it('is a group of two labelled date inputs kept inside the allowed range (feature 005)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    const { user } = renderWithProviders(<Example start="2026-03-12" />);

    expect(
      screen.getByRole('group', { name: 'Dates Needed to publish' }),
    ).toHaveAccessibleDescription(
      "Must be inside the campaign's dates (01 Feb – 30 Nov 2026) This campaign runs outside 2026, the plan's year",
    );
    const start = screen.getByLabelText('Start date');
    const end = screen.getByLabelText('End date');
    expect(start).toHaveAttribute('id', 'initiative-startDate');
    expect(end).toHaveAttribute('id', 'initiative-endDate');
    expect(start).toHaveValue('12 Mar 2026');

    await user.click(screen.getByRole('button', { name: 'Choose end date' }));
    const calendar = screen.getByRole('dialog', { name: 'Choose end date' });
    expect(within(calendar).getByRole('grid')).toHaveAccessibleDescription(
      'Choose a date from 12 Mar 2026 to 30 Nov 2026.',
    );
    expect(
      within(calendar).getByRole('button', { name: 'Wednesday 11 March 2026, not available' }),
    ).toHaveAttribute('aria-disabled', 'true');
    vi.useRealTimers();
  });

  it('shows each date’s problem under it', () => {
    renderWithProviders(<Example />);

    const end = screen.getByLabelText('End date');
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(end).toHaveAccessibleDescription(
      'End date must be on or after the start date (12 Mar 2026).',
    );
  });

  it('reports both dates when one changes', () => {
    renderWithProviders(<Example start="2026-03-01" />);

    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-05-31' } });

    expect(screen.getByText('range: 2026-03-01…2026-05-31')).toBeInTheDocument();
  });

  it('locks the end date and says why', () => {
    renderWithProviders(
      <DateRangeField
        label="Dates"
        idPrefix="field"
        start="2026-03-01"
        end=""
        onChange={() => {}}
        endDisabledReason="Ongoing (no end date)"
      />,
    );

    expect(screen.getByLabelText('End date')).toBeDisabled();
    expect(screen.getByText('Ongoing (no end date)')).toBeInTheDocument();
  });

  it('keeps the start typed a moment ago when the end follows before the page re-renders', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <DateRangeField label="Dates" idPrefix="filter" start="" end="" onChange={onChange} />,
    );

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-07-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-12-31' } });

    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-07-01', end: '2026-12-31' });
  });
});
