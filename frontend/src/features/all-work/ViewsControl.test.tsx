import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HttpHandler } from 'msw';
import { savedView, standard2026 } from '@/testing/fixtures/all-work';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import type { ViewState } from './all-work-types';
import { ViewsControl } from './ViewsControl';

const STATE: ViewState = { ...standard2026(), view: 'budget' };
const DECLINED = savedView();

function renderControl(answers: HttpHandler[]) {
  const api = mockApi([
    reply('GET /api/v1/saved-views', { body: { items: [DECLINED], total: 1 } }),
    ...answers,
  ]);
  const rendered = renderWithProviders(
    <ViewsControl
      state={STATE}
      appliedViewId={null}
      onApply={vi.fn()}
      onSaved={vi.fn()}
      onStandard={vi.fn()}
    />,
    { user: testUser() },
  );
  return { ...rendered, api };
}

async function choose(user: ReturnType<typeof renderControl>['user'], item: string) {
  await user.click(await screen.findByRole('button', { name: 'Saved views' }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

describe('ViewsControl saved-view requests (US6, FR-029, FR-031)', () => {
  it('replaces a view of the same name with the state on screen (FR-029)', async () => {
    const { api, user } = renderControl([
      reply(
        'PATCH /api/v1/saved-views/{viewId}',
        { body: { ...DECLINED, state: STATE } },
        { viewId: 'SV-1001' },
      ),
    ]);

    await choose(user, 'Save current view…');
    const dialog = screen.getByRole('dialog', { name: 'Save current view' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Declined activities');
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));
    await user.click(await screen.findByRole('button', { name: 'Replace view' }));

    await waitFor(() =>
      expect(api.bodiesOf('PATCH /api/v1/saved-views/SV-1001')).toEqual([{ state: STATE }]),
    );
  });

  it('sets the default, renames, deletes after asking and Undo saves the view again (FR-031)', async () => {
    const { api, user } = renderControl([
      reply('PATCH /api/v1/saved-views/{viewId}', { body: DECLINED }, { viewId: 'SV-1001' }),
      reply('DELETE /api/v1/saved-views/{viewId}', { body: DECLINED }, { viewId: 'SV-1001' }),
      reply('POST /api/v1/saved-views', { status: 201, body: { ...DECLINED, id: 'SV-1003' } }),
    ]);

    await choose(user, 'Manage views…');
    const panel = screen.getByRole('dialog', { name: 'Your saved views' });
    await user.click(
      within(panel).getByRole('button', { name: 'Set as default Declined activities' }),
    );
    await user.click(within(panel).getByRole('button', { name: 'Rename Declined activities' }));
    const rename = await screen.findByRole('dialog', { name: 'Rename view' });
    const name = within(rename).getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, 'Declined in Europe');
    await user.click(within(rename).getByRole('button', { name: 'Rename view' }));
    await screen.findByText("View 'Declined activities' renamed");
    await user.click(within(panel).getByRole('button', { name: 'Delete Declined activities' }));
    await user.click(await screen.findByRole('button', { name: 'Delete view' }));
    await screen.findByText("View 'Declined activities' deleted");
    await user.click(screen.getByRole('button', { name: 'Undo', hidden: true }));

    await waitFor(() =>
      expect(api.bodiesOf('POST /api/v1/saved-views')).toEqual([
        { name: DECLINED.name, state: DECLINED.state, isDefault: false },
      ]),
    );
    expect(api.bodiesOf('PATCH /api/v1/saved-views/SV-1001')).toEqual([
      { isDefault: true },
      { name: 'Declined in Europe' },
    ]);
  });
});
