import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { Menu } from './Menu';

function Views({ onApply = vi.fn(), onSave = vi.fn() }) {
  return (
    <Menu.Root>
      <Menu.Trigger>Saved views</Menu.Trigger>
      <Menu.Content>
        <Menu.Choice checked onChoose={onApply}>
          Europe
        </Menu.Choice>
        <Menu.Choice checked={false} onChoose={onApply}>
          Asia
        </Menu.Choice>
        <Menu.Separator />
        <Menu.Item onChoose={onSave} hint="Keeps the filters you see now.">
          Save current view…
        </Menu.Item>
        <Menu.Note>Views are yours alone.</Menu.Note>
      </Menu.Content>
    </Menu.Root>
  );
}

describe('Menu', () => {
  it('ticks the current choice and reads an item’s hint with it', async () => {
    const user = userEvent.setup();
    render(<Views />);

    await user.click(screen.getByRole('button', { name: 'Saved views' }));

    expect(screen.getByRole('menuitemcheckbox', { name: 'Europe' })).toBeChecked();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Asia' })).not.toBeChecked();
    expect(
      screen.getByRole('menuitem', { name: 'Save current view…' }),
    ).toHaveAccessibleDescription('Keeps the filters you see now.');
    expect(screen.getByText('Views are yours alone.')).toBeVisible();
    await expectNoAxeViolations();
  });

  it('runs the chosen item once the menu has closed and the focus is back on its trigger', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
    render(<Views onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Saved views' }));
    await user.click(screen.getByRole('menuitem', { name: 'Save current view…' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Saved views' })).toHaveFocus();
  });

  it('works with the keyboard alone: arrows move, Enter chooses, Escape closes', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Views onApply={onApply} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
  });
});
