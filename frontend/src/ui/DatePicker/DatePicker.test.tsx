import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { choose } from '@/testing/select';
import { DateField } from '../DateField/DateField';

function Field({ initial = '', min, max }: { initial?: string; min?: string; max?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateField
        name="when"
        label="Start date"
        value={value}
        min={min}
        max={max}
        onChange={setValue}
      />
      <p>chosen: {value}</p>
    </>
  );
}

async function openPicker(ui = <Field initial="2026-11-12" />) {
  const rendered = renderWithProviders(ui);
  const button = screen.getByRole('button', { name: 'Choose start date' });
  await rendered.user.click(button);
  return { ...rendered, button, dialog: screen.getByRole('dialog', { name: 'Choose start date' }) };
}

describe('the date picker (design system §5.5, D-424)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('opens on the chosen day, Monday first, today marked, and passes axe', async () => {
    const { dialog } = await openPicker(<Field initial="2026-11-20" />);

    const grid = within(dialog).getByRole('grid', { name: 'November 2026' });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    expect(within(grid).getByRole('button', { name: 'Friday 20 November 2026' })).toHaveFocus();
    expect(within(grid).getByRole('gridcell', { selected: true })).toHaveTextContent('20');
    expect(within(grid).getByRole('button', { name: 'Thursday 12 November 2026' })).toHaveAttribute(
      'aria-current',
      'date',
    );
    await expectNoAxeViolations();
  });

  it.each([
    ['{ArrowLeft}', 'Wednesday 11 November 2026'],
    ['{ArrowRight}', 'Friday 13 November 2026'],
    ['{ArrowUp}', 'Thursday 5 November 2026'],
    ['{ArrowDown}', 'Thursday 19 November 2026'],
    ['{Home}', 'Monday 9 November 2026'],
    ['{End}', 'Sunday 15 November 2026'],
    ['{PageUp}', 'Monday 12 October 2026'],
    ['{PageDown}', 'Saturday 12 December 2026'],
    ['{Shift>}{PageUp}{/Shift}', 'Wednesday 12 November 2025'],
    ['{Shift>}{PageDown}{/Shift}', 'Friday 12 November 2027'],
  ])('moves the focus on %s to %s', async (keys, name) => {
    const { user, dialog } = await openPicker();

    await user.keyboard(keys);

    expect(within(dialog).getByRole('button', { name })).toHaveFocus();
  });

  it('chooses the focused day with Enter and gives the focus back to its button', async () => {
    const { user, button } = await openPicker();

    await user.keyboard('{ArrowRight}{Enter}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('chosen: 2026-11-13')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Start date' })).toHaveValue('13 Nov 2026');
    expect(button).toHaveFocus();
  });

  it('closes on Escape without choosing, the focus back on its button', async () => {
    const { user, button } = await openPicker();

    await user.keyboard('{ArrowRight}{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('chosen: 2026-11-12')).toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('moves to the next month, and jumps to a month and year, the grid named after it', async () => {
    const { user, dialog } = await openPicker();

    await user.click(within(dialog).getByRole('button', { name: 'Next month' }));
    expect(within(dialog).getByRole('grid', { name: 'December 2026' })).toBeInTheDocument();
    await choose(user, within(dialog).getByRole('combobox', { name: 'Month' }), 'March');
    await choose(user, within(dialog).getByRole('combobox', { name: 'Year' }), '2028');

    expect(within(dialog).getByRole('grid', { name: 'March 2028' })).toBeInTheDocument();
  });

  it('refuses the days outside min and max, and says which days it takes', async () => {
    const { user, dialog } = await openPicker(<Field min="2026-11-10" max="2026-11-20" />);

    const early = within(dialog).getByRole('button', {
      name: 'Monday 9 November 2026, not available',
    });
    expect(early).toHaveAttribute('aria-disabled', 'true');
    expect(within(dialog).getByRole('grid')).toHaveAccessibleDescription(
      'Choose a date from 10 Nov 2026 to 20 Nov 2026.',
    );
    await user.click(early);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('chosen:')).toBeInTheDocument();
  });

  it('chooses today, and Clear empties the field', async () => {
    const { user, dialog } = await openPicker(<Field initial="2026-03-01" />);

    await user.click(within(dialog).getByRole('button', { name: 'Today' }));
    expect(screen.getByText('chosen: 2026-11-12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Choose start date' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByText('chosen:')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Start date' })).toHaveValue('');
  });
});
