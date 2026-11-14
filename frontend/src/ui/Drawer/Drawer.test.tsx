import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button/Button';
import { Drawer } from './Drawer';

function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open menu</Button>
      <Drawer open={open} onOpenChange={setOpen} title="Menu" closeLabel="Close menu">
        <a href="/plans">Plans</a>
      </Drawer>
    </>
  );
}

async function openDrawer() {
  const user = userEvent.setup();
  render(<Page />);
  await user.click(screen.getByRole('button', { name: 'Open menu' }));
  return { user, drawer: screen.getByRole('dialog', { name: 'Menu' }) };
}

describe('Drawer', () => {
  it('opens named by its title, with the focus inside it', async () => {
    const { drawer } = await openDrawer();

    expect(within(drawer).getByRole('link', { name: 'Plans' })).toBeVisible();
    expect(drawer.contains(document.activeElement)).toBe(true);
  });

  it('keeps the keyboard inside while open', async () => {
    const { user, drawer } = await openDrawer();

    await user.tab();
    await user.tab();
    await user.tab();

    expect(drawer.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape and returns the focus to the button that opened it', async () => {
    const { user } = await openDrawer();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus());
  });

  it('closes with its close button', async () => {
    const { user, drawer } = await openDrawer();

    await user.click(within(drawer).getByRole('button', { name: 'Close menu' }));

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus());
  });
});
