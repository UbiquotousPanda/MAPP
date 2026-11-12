import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { logSummary } from '@/testing/fixtures/activity-log';
import { openFilters } from '@/testing/filters';
import { LogFilterBar, SEARCH_DELAY_MS } from './LogFilterBar';
import { NO_FILTERS } from './log-filters';
import type { LogFilterState } from './log-filters';

type OnChange = (filters: LogFilterState) => void;

/** The filter bar with its filters kept in state, as the page keeps them in the address. */
function Harness({ initial, onChange }: { initial: LogFilterState; onChange: OnChange }) {
  const [filters, setFilters] = useState(initial);
  return (
    <LogFilterBar
      filters={filters}
      onChange={(next) => {
        onChange(next);
        setFilters(next);
      }}
      summary={logSummary()}
      record={{ type: 'activity', id: 'A-1042', name: 'Film shoot' }}
    />
  );
}

function renderBar(initial: Partial<LogFilterState> = {}) {
  const onChange = vi.fn<OnChange>();
  const rendered = renderWithProviders(
    <Harness initial={{ ...NO_FILTERS, ...initial }} onChange={onChange} />,
    { user: testUser() },
  );
  return { ...rendered, onChange };
}

describe('LogFilterBar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers the summary’s people, record types and plans (FR-003)', async () => {
    const { user } = renderBar();
    await openFilters(user);

    const options = async (name: string) => {
      await user.click(screen.getByRole('button', { name }));
      const menu = await screen.findByRole('dialog', { name });
      const shown = within(menu)
        .getAllByRole('radio')
        .map((radio) => radio.closest('label')?.textContent);
      await user.keyboard('{Escape}');
      return shown;
    };
    expect(await options('Person')).toEqual(['Anyone', 'Daniel Okoro', 'Priya Raman']);
    expect(await options('Record type')).toEqual(['Any type', 'Activity', 'Line item']);
    expect(await options('Plan')).toEqual(['Any plan', 'FY2026 Lubricants Europe']);
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search name, ID or person' }),
    ).toBeInTheDocument();
  });

  it('filters by person and shows the filter as a chip (FR-003)', async () => {
    const { user, onChange } = renderBar();
    await openFilters(user);

    await user.click(screen.getByRole('button', { name: 'Person' }));
    await user.click(await screen.findByRole('radio', { name: 'Daniel Okoro' }));

    expect(onChange).toHaveBeenLastCalledWith({ ...NO_FILTERS, person: 'U-1003' });
    expect(
      screen.getByRole('button', { name: 'Remove filter: Person: Daniel Okoro' }),
    ).toBeInTheDocument();
  });

  it('ticks several actions in one menu, kept in the menu’s order (FR-003)', async () => {
    const { user, onChange } = renderBar();
    await openFilters(user);

    await user.click(screen.getByRole('button', { name: 'Action' }));
    await user.click(screen.getByRole('checkbox', { name: 'Permanently deleted' }));
    await user.click(screen.getByRole('checkbox', { name: 'Deleted' }));

    expect(onChange).toHaveBeenLastCalledWith({
      ...NO_FILTERS,
      actions: ['deleted', 'deletedPermanently'],
    });
    expect(screen.getByRole('checkbox', { name: 'Deleted' })).toBeChecked();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Action · 2' })).toBeInTheDocument();
  });

  it('chooses a date range, and Custom dates with their error (FR-003)', async () => {
    const { user, onChange } = renderBar();
    await openFilters(user);

    await user.click(screen.getByRole('button', { name: 'Date' }));
    await user.click(await screen.findByRole('radio', { name: 'This week' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_FILTERS, range: 'week' });
    expect(screen.getByRole('button', { name: 'Remove filter: Date: This week' })).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Dates' }));
    await user.type(screen.getByLabelText('From'), '2026-10-12');
    await user.type(screen.getByLabelText('To'), '2026-10-01');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The end date must be on or after the start date.',
    );
    expect(screen.getByLabelText('To')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('To')).toHaveAccessibleDescription(
      'The end date must be on or after the start date.',
    );

    await user.clear(screen.getByLabelText('To'));
    await user.type(screen.getByLabelText('To'), '2026-10-14');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove filter: Date: 12 Oct 2026 – 14 Oct 2026' }),
    ).toBeInTheDocument();
  });

  it('searches 300 ms after the last key (FR-003)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onChange } = renderBar();

    await user.type(screen.getByRole('searchbox', { name: 'Search name, ID or person' }), 'film');
    expect(onChange).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, q: 'film' });
    expect(screen.getByRole('button', { name: "Remove filter: Search: 'film'" })).toBeVisible();
  });

  it('removes one filter per chip, and every filter with Clear filters (FR-003)', async () => {
    const { user, onChange } = renderBar({
      person: 'U-1002',
      record: 'A-1042',
      inside: true,
      q: 'film',
    });

    expect(
      screen.getByRole('button', {
        name: "Remove filter: Record: Activity 'Film shoot' (A-1042) and items inside",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove filter: Person: Priya Raman' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...NO_FILTERS,
      record: 'A-1042',
      inside: true,
      q: 'film',
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onChange).toHaveBeenLastCalledWith(NO_FILTERS);
    expect(screen.getByRole('searchbox', { name: 'Search name, ID or person' })).toHaveValue('');
  });
});
