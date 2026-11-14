import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { nth } from '@/testing/dom';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import type { SavedViewChoice } from '../SavedViewsMenu/SavedViewsMenu';
import { ManageViewsPanel } from './ManageViewsPanel';
import type { ManageViewsPanelProps } from './ManageViewsPanel';

const DECLINED: SavedViewChoice = { id: 'SV-1001', name: 'Declined activities', isDefault: false };
const BY_MONTH: SavedViewChoice = { id: 'SV-1002', name: 'Lubricants by month', isDefault: true };

type Variant = Pick<
  ManageViewsPanelProps<SavedViewChoice>,
  'star' | 'deleteQuestion' | 'defaultMessage'
>;

function renderPanel(changes: Partial<ManageViewsPanelProps<SavedViewChoice>['changes']> = {}) {
  return renderVariant({ deleteQuestion: 'Only your saved view is deleted.' }, changes);
}

function renderVariant(
  variant: Variant,
  changes: Partial<ManageViewsPanelProps<SavedViewChoice>['changes']> = {},
) {
  const onOpenChange = vi.fn();
  const rendered = renderWithProviders(
    <ManageViewsPanel
      open
      onOpenChange={onOpenChange}
      views={[DECLINED, BY_MONTH]}
      changes={{ change: vi.fn(), remove: vi.fn(), restore: vi.fn(), ...changes }}
      {...variant}
    />,
    { user: testUser() },
  );
  return {
    ...rendered,
    onOpenChange,
    panel: screen.getByRole('dialog', { name: 'Your saved views' }),
  };
}

describe('ManageViewsPanel', () => {
  it('lists the views with their actions and the default tagged', () => {
    const { panel } = renderPanel();

    const items = within(panel).getAllByRole('listitem');
    expect(items.map((item) => item.firstElementChild?.textContent)).toEqual([
      'Declined activities',
      'Lubricants by monthDefault',
    ]);
    expect(
      within(nth(items, 0))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'Set as default Declined activities',
      'Rename Declined activities',
      'Delete Declined activities',
    ]);
    expect(
      within(nth(items, 1)).getByRole('button', { name: 'Remove default Lubricants by month' }),
    ).toBeVisible();
  });

  it('sets and removes the default view', async () => {
    const change = vi.fn((view: SavedViewChoice, body: object) =>
      Promise.resolve({ ...view, ...body }),
    );
    const { user, panel } = renderPanel({ change });

    await user.click(
      within(panel).getByRole('button', { name: 'Set as default Declined activities' }),
    );
    expect(
      await screen.findByText("'Declined activities' is now your default view"),
    ).toBeInTheDocument();
    await user.click(
      within(panel).getByRole('button', { name: 'Remove default Lubricants by month' }),
    );
    expect(
      await screen.findByText("'Lubricants by month' is no longer your default view"),
    ).toBeInTheDocument();
    expect(change.mock.calls).toEqual([
      [DECLINED, { isDefault: true }],
      [BY_MONTH, { isDefault: false }],
    ]);
  });

  it('stars the default instead, with its own message', async () => {
    const change = vi.fn((view: SavedViewChoice) => Promise.resolve({ ...view, isDefault: true }));
    const { user, panel } = renderVariant(
      { star: true, defaultMessage: (name) => `The report now opens on '${name}'` },
      { change },
    );

    const starred = within(panel).getByRole('button', { name: 'Default Lubricants by month' });
    expect(starred).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(panel).getByRole('button', { name: 'Default Declined activities' }));

    expect(change).toHaveBeenCalledWith(DECLINED, { isDefault: true });
    expect(
      await screen.findByText("The report now opens on 'Declined activities'"),
    ).toBeInTheDocument();
  });

  it('renames a view, refusing a name the person already uses', async () => {
    const change = vi.fn().mockResolvedValue({ ...DECLINED, name: 'Declined in Europe' });
    const { user, panel } = renderPanel({ change });

    await user.click(within(panel).getByRole('button', { name: 'Rename Declined activities' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rename view' });
    const name = within(dialog).getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Declined activities');
    await user.clear(name);
    await user.type(name, 'LUBRICANTS by month');
    await user.click(within(dialog).getByRole('button', { name: 'Rename view' }));
    expect(name).toHaveAccessibleDescription(
      expect.stringContaining("You already have a view called 'LUBRICANTS by month'."),
    );

    await user.clear(name);
    await user.type(name, ' Declined in Europe ');
    await user.click(within(dialog).getByRole('button', { name: 'Rename view' }));

    expect(await screen.findByText("View 'Declined in Europe' renamed")).toBeInTheDocument();
    expect(change.mock.calls).toEqual([[DECLINED, { name: 'Declined in Europe' }]]);
  });

  it('deletes a view after asking, and Undo saves it again', async () => {
    const remove = vi.fn().mockResolvedValue(DECLINED);
    const restore = vi.fn().mockResolvedValue({ ...DECLINED, id: 'SV-1003' });
    const { user, panel, onOpenChange } = renderPanel({ remove, restore });

    await user.click(within(panel).getByRole('button', { name: 'Delete Declined activities' }));
    const question = await screen.findByRole('alertdialog', {
      name: "Delete view 'Declined activities'?",
    });
    expect(question).toHaveTextContent('Only your saved view is deleted.');
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(question).getByRole('button', { name: 'Delete view' }));

    expect(await screen.findByText("View 'Declined activities' deleted")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Undo', hidden: true }));

    expect(await screen.findByText("View 'Declined activities' restored")).toBeInTheDocument();
    expect(restore).toHaveBeenCalledWith(DECLINED);
  });

  it('without a question, deletes at once and closes the panel', async () => {
    const remove = vi.fn().mockResolvedValue(DECLINED);
    const { user, panel, onOpenChange } = renderVariant({ star: true }, { remove });

    await user.click(within(panel).getByRole('button', { name: 'Delete Declined activities' }));

    expect(await screen.findByText("View 'Declined activities' deleted")).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('says when a view was deleted in another tab', async () => {
    const change = vi.fn().mockRejectedValue(new ApiError('notFound', { status: 404 }));
    const { user, panel } = renderPanel({ change });

    await user.click(
      within(panel).getByRole('button', { name: 'Set as default Declined activities' }),
    );

    expect(
      await screen.findByText(
        'This view no longer exists — it may have been deleted in another tab.',
      ),
    ).toBeInTheDocument();
  });
});
