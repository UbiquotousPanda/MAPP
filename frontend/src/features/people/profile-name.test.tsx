import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/testing/app';
import { PROFILE } from '@/testing/fixtures/route-answers';
import { testUser } from '@/testing/fixtures/users';
import { reply } from '@/testing/replies';

describe('My profile in the app (feature 003)', () => {
  it('shows a new name on the account button as soon as My profile saves it (US4-2)', async () => {
    const renamed = testUser({
      name: 'Priya Iyer',
      firstName: 'Priya',
      initials: 'PI',
      version: 2,
    });
    let saved = false;
    const { user } = renderApp('/profile', [
      ...PROFILE,
      reply('PATCH /api/v1/me', () => {
        saved = true;
        return { body: renamed };
      }),
      reply('GET /api/v1/me', () => ({ body: saved ? renamed : testUser() })),
    ]);
    const accountButtons = () => screen.getAllByRole('button', { name: 'Priya — account menu' });
    const editDetails = await screen.findByRole('button', { name: 'Edit details' });
    expect(accountButtons()[0]).toHaveTextContent('PR');

    await user.click(editDetails);
    const panel = await screen.findByRole('dialog', { name: 'Edit your details' });
    const name = within(panel).getByRole('textbox', { name: /Name/ });
    await user.clear(name);
    await user.type(name, 'Priya Iyer');
    await user.click(within(panel).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Your details saved')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit your details' })).not.toBeInTheDocument(),
    );
    for (const button of accountButtons()) {
      expect(button).toHaveTextContent('PI');
    }
  });
});
