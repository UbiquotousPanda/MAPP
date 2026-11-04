import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { closestTo } from '@/testing/dom';
import { reportFrame } from '@/testing/fixtures/reports';
import { renderWithProviders } from '@/testing/render';
import { FilterPanel } from './FilterPanel';
import { DEFAULT_ADDRESS } from './report-address';
import type { ReportAddress } from './report-address';

function renderPanel(choices = reportFrame().choices, applied: ReportAddress = DEFAULT_ADDRESS) {
  const onApply = vi.fn();
  const rendered = renderWithProviders(
    <FilterPanel choices={choices} applied={applied} year={2026} onApply={onApply} />,
  );
  return { ...rendered, onApply };
}

describe('FilterPanel (039 FR-008 – FR-013)', () => {
  it("lists the groups in FR-008's order with their counters, my teams first", async () => {
    renderPanel();

    const legends = screen
      .getAllByRole('group')
      .map(
        (g) =>
          within(g).queryByText(/^(Plans|Plan type|Team|Owner|Activity type|Activity status)/)
            ?.textContent,
      );
    expect(legends.filter(Boolean)).toEqual([
      'Plans (2 / 2)',
      'Plan type (3 / 3)',
      'Team (2 / 2)',
      'Owner (2 / 2)',
      'Activity type (1 / 1)',
      'Activity status (6 / 6)',
    ]);
    const team = screen.getByRole('group', { name: /Team/ });
    expect(within(team).getAllByRole('checkbox')[0]).toHaveAccessibleName('Lubricants Europe');
    await expectNoAxeViolations();
  });

  it('changes nothing until Apply, in a bar that stays in view, then applies the values ticked (FR-013)', async () => {
    const { user, onApply } = renderPanel();

    await user.click(screen.getByRole('checkbox', { name: 'FY2026 Mobility' }));

    expect(screen.getByRole('status')).toHaveTextContent('Changes not applied yet');
    expect(onApply).not.toHaveBeenCalled();
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(closestTo(apply, '[class*="applyBar"]')).toContainElement(screen.getByRole('status'));
    expect(screen.getByRole('switch', { name: 'Update as I choose' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await user.click(apply);
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ plans: ['P-1001'], year: 2026 }),
    );
  });

  it('keeps Apply off, with the reason, while a group has nothing ticked (FR-013)', async () => {
    const { user, onApply } = renderPanel(reportFrame().choices, {
      ...DEFAULT_ADDRESS,
      activityStatuses: ['approved'],
    });
    const statuses = screen.getByRole('group', { name: /Activity status/ });

    await user.click(within(statuses).getByRole('button', { name: 'Clear all' }));

    expect(within(statuses).getByText('(0 / 6)')).toBeInTheDocument();
    expect(screen.getByText('Tick at least one value in Activity status.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

    await user.click(within(statuses).getByRole('button', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ activityStatuses: [] }));
  });

  it('changes the year at once, saying first that it clears the chosen plans (FR-013)', async () => {
    const { user, onApply } = renderPanel(reportFrame().choices, {
      ...DEFAULT_ADDRESS,
      plans: ['P-1001'],
    });
    const year = screen.getByRole('combobox', { name: 'Year' });
    expect(year).toHaveAccessibleDescription('Another year clears the plan you chose.');

    await user.selectOptions(year, '2025');

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ year: 2025, plans: [] }));
  });

  it('closes on Escape without change and returns focus to Filters (n) (FR-013)', async () => {
    const { user, onApply } = renderPanel();
    const toggle = screen.getByRole('button', { name: 'Filters (0)' });
    await user.click(toggle);
    await user.click(screen.getByRole('checkbox', { name: 'FY2026 Mobility' }));

    await user.keyboard('{Escape}');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(screen.getByRole('checkbox', { name: 'FY2026 Mobility' })).toBeChecked();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('offers Select all and Clear all above four values and a search above ten (FR-010)', async () => {
    const owners = Array.from({ length: 11 }, (_, i) => ({
      id: `U-${String(2000 + i)}`,
      name: `Owner ${String(i)}`,
    }));
    const { user } = renderPanel({ ...reportFrame().choices, owners });
    const owner = screen.getByRole('group', { name: /Owner/ });
    const planType = screen.getByRole('group', { name: /Plan type/ });
    expect(within(planType).queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
    expect(within(owner).getByRole('button', { name: 'Select all' })).toBeInTheDocument();

    await user.type(within(owner).getByRole('searchbox', { name: 'Search Owner' }), 'Owner 1');

    expect(
      within(owner)
        .getAllByRole('checkbox')
        .map((c) => c.getAttribute('aria-label') ?? c.closest('label')?.textContent),
    ).toHaveLength(2);
  });
});
