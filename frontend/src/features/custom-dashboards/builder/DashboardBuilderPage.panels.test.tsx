import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { NO_PLANS } from '@/testing/fixtures/session';
import { testUser } from '@/testing/fixtures/users';
import { SOURCES } from './builder-fixtures';
import { DashboardBuilderPage } from './DashboardBuilderPage';

function renderBuilder() {
  mockApi([
    ...NO_PLANS,
    reply('GET /api/v1/teams', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/data-sources', { body: { items: SOURCES } }),
  ]);
  return renderWithProviders(<DashboardBuilderPage />, {
    user: testUser(),
    route: '/builder',
    path: '/builder/:dashboardId?',
  });
}

describe('051 FR-026: the settings can be hidden to give the canvas room', () => {
  it('hides the settings, and shows them again to reach a field named by a save problem', async () => {
    const { user } = renderBuilder();

    await user.click(screen.getByRole('button', { name: 'Hide settings' }));
    expect(screen.queryByRole('complementary', { name: 'Inspector' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(await screen.findByRole('link', { name: 'Enter a name.' }));

    await waitFor(() => expect(screen.getByRole('textbox', { name: /Name/ })).toHaveFocus());
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument();
  });
});

describe('051 FR-026: Undo and Redo are unavailable until there is a change to reverse', () => {
  it('starts with both unavailable, then offers Undo after a change and Redo after Undo', async () => {
    const { user } = renderBuilder();
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo).toHaveAttribute('aria-disabled', 'true');
    expect(redo).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('button', { name: 'Add text note' }));
    expect(undo).not.toHaveAttribute('aria-disabled');

    await user.click(undo);
    expect(undo).toHaveAttribute('aria-disabled', 'true');
    expect(redo).not.toHaveAttribute('aria-disabled');
  });
});
