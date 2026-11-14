import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { Popover } from './Popover';

function Filters() {
  return (
    <Popover.Root>
      <Popover.Trigger>Filters</Popover.Trigger>
      <Popover.Content aria-label="Filters" padding="lg">
        <label>
          <input type="checkbox" /> Draft
        </label>
      </Popover.Content>
    </Popover.Root>
  );
}

describe('Popover', () => {
  it('opens a named panel from its trigger and closes on Escape, giving the focus back', async () => {
    const user = userEvent.setup();
    render(<Filters />);
    const trigger = screen.getByRole('button', { name: 'Filters' });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Filters' })).toContainElement(
      screen.getByRole('checkbox', { name: 'Draft' }),
    );
    await expectNoAxeViolations();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
