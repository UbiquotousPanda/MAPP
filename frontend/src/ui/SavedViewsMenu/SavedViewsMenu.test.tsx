import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { SavedViewsMenu } from './SavedViewsMenu';
import type { SavedViewsMenuProps, SavedViewChoice } from './SavedViewsMenu';

const EUROPE = { id: 'V-1', name: 'Europe', isDefault: true };
const ASIA = { id: 'V-2', name: 'Asia', isDefault: false };

function renderMenu(props: Partial<SavedViewsMenuProps<SavedViewChoice>> = {}) {
  const onApply = vi.fn();
  const onSave = vi.fn();
  render(
    <SavedViewsMenu
      views={[EUROPE, ASIA]}
      active={null}
      modified={false}
      empty="No saved views yet."
      onApply={onApply}
      actions={[{ label: 'Save current view…', onChoose: onSave }]}
      {...props}
    />,
  );
  return { user: userEvent.setup(), onApply, onSave };
}

describe('SavedViewsMenu', () => {
  it('ticks the active view, tags the default and lists the actions under the views', async () => {
    const { user } = renderMenu({ active: ASIA });

    await user.click(screen.getByRole('button', { name: 'View: Asia' }));

    const views = await screen.findAllByRole('menuitemcheckbox');
    expect(views.map((item) => item.textContent)).toEqual(['EuropeDefault', 'Asia']);
    expect(views[1]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Save current view…',
    ]);
    await expectNoAxeViolations();
  });

  it('applies the chosen view and runs the chosen action', async () => {
    const { user, onApply, onSave } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Saved views' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Europe/ }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(EUROPE));

    await user.click(screen.getByRole('button', { name: 'Saved views' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Save current view…' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('says Modified on the button and explains an empty list', async () => {
    const { user } = renderMenu({ views: [], active: EUROPE, modified: true });

    await user.click(screen.getByRole('button', { name: 'View: Europe Modified' }));

    expect(await screen.findByText('No saved views yet.')).toBeInTheDocument();
    expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument();
  });
});
