import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import type { SavedViewChoice } from '../SavedViewsMenu/SavedViewsMenu';
import { SaveViewDialog } from './SaveViewDialog';

const DECLINED: SavedViewChoice = { id: 'SV-1001', name: 'Declined activities', isDefault: false };

function renderDialog(create = vi.fn(), replace = vi.fn()) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  const rendered = renderWithProviders(
    <SaveViewDialog
      title="Save current view"
      defaultLabel="Use as my default view"
      replaceText="It will show what you see now."
      views={[DECLINED]}
      create={create}
      replace={replace}
      onSaved={onSaved}
      onOpenChange={onOpenChange}
    />,
    { user: testUser() },
  );
  const dialog = screen.getByRole('dialog', { name: 'Save current view' });
  const name = within(dialog).getByRole('textbox', { name: 'Name' });
  return { ...rendered, dialog, name, onSaved, onOpenChange };
}

describe('SaveViewDialog', () => {
  it('saves under the trimmed name, as the default when ticked, and closes', async () => {
    const saved = { id: 'SV-1009', name: 'Lubricants by month', isDefault: true };
    const create = vi.fn().mockResolvedValue(saved);
    const { user, dialog, name, onSaved, onOpenChange } = renderDialog(create);

    await user.type(name, '  Lubricants by month ');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Use as my default view' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(create).toHaveBeenCalledWith('Lubricants by month', true);
    // The dialog stays on screen here (onOpenChange is a stand-in), so the message is found by text.
    expect(await screen.findByText("View 'Lubricants by month' saved")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('asks for a name and allows 60 characters at most, at the field and in the summary', async () => {
    const create = vi.fn();
    const { user, dialog, name } = renderDialog(create);

    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));
    expect(name).toHaveAccessibleDescription(expect.stringContaining('Enter a name for the view.'));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('1 problem needs your attention');

    await user.type(name, 'x'.repeat(61));
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));
    expect(name).toHaveAccessibleDescription(
      expect.stringContaining('Use 60 characters or fewer.'),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('asks before replacing a view with the same name, ignoring letter case', async () => {
    const create = vi.fn();
    const replace = vi.fn().mockResolvedValue(DECLINED);
    const { user, dialog, name, onSaved } = renderDialog(create, replace);

    await user.type(name, 'declined ACTIVITIES');
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));
    const question = await screen.findByRole('alertdialog', {
      name: "Replace your view 'Declined activities'?",
    });
    expect(question).toHaveTextContent('It will show what you see now.');
    await user.click(within(question).getByRole('button', { name: 'Replace view' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(DECLINED));
    expect(replace).toHaveBeenCalledWith(DECLINED, false);
    expect(create).not.toHaveBeenCalled();
    expect(await screen.findByText("View 'Declined activities' updated")).toBeInTheDocument();
  });

  it('keeps the name when the replace question is cancelled', async () => {
    const { user, dialog, name } = renderDialog();

    await user.type(name, 'Declined activities');
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel', hidden: false }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(name).toHaveValue('Declined activities');
  });

  it('shows the API’s refusal at the field', async () => {
    const taken = "You already have a view called 'Q4 review'.";
    const create = vi
      .fn()
      .mockRejectedValue(
        new ApiError('validation', { status: 400, fields: [{ field: 'name', message: taken }] }),
      );
    const { user, dialog, name } = renderDialog(create);

    await user.type(name, 'Q4 review');
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));

    await waitFor(() => expect(name).toHaveAccessibleDescription(`required ${taken}`));
  });
});
