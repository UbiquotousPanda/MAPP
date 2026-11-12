import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HttpHandler } from 'msw';
import { SESSION_KEY } from '@/session/useSession';
import type { CurrentUser } from '@/session/useSession';
import { mockApi } from '@/testing/mock-api';
import { findMessages, renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { DISPLAY_CURRENCIES } from '@/testing/fixtures/home';
import { reply } from '@/testing/replies';
import { choose } from '@/testing/select';
import { CurrencyPicker } from './CurrencyPicker';

const CURRENCY_LIST = { body: { items: DISPLAY_CURRENCIES, total: DISPLAY_CURRENCIES.length } };
const IN_EUROS = testUser({ preferences: { ...testUser().preferences, displayCurrency: 'EUR' } });

function renderPicker(answers: HttpHandler[] = [], user: CurrentUser = testUser()) {
  const api = mockApi([
    reply('GET /api/v1/me/display-currencies', CURRENCY_LIST),
    // A saved choice asks every query again, the session too.
    reply('GET /api/v1/me', { body: IN_EUROS }),
    ...answers,
  ]);
  const rendered = renderWithProviders(<CurrencyPicker />, { user });
  return { ...rendered, api };
}

function picker() {
  return screen.getByRole('combobox', { name: 'Display currency' });
}

describe('CurrencyPicker', () => {
  it("shows the display currency's code and offers the currencies My profile offers (FR-002, US1 scenario 1, D-217, D-413)", async () => {
    const { user } = renderPicker();

    expect(picker()).toHaveTextContent(/^USD$/);
    expect(picker()).toHaveAccessibleDescription('Every page shows its amounts in this currency.');
    await user.click(picker());
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'EUR – Euro',
      'GBP – Pound sterling',
      'USD – US dollar',
    ]);
  });

  it('keeps an inactive display currency in the list, because it stays in use (D-201)', async () => {
    const { user } = renderPicker(
      [
        reply('GET /api/v1/me/display-currencies', {
          body: {
            items: [{ code: 'CNY', name: 'Chinese yuan', active: false }, ...DISPLAY_CURRENCIES],
            total: 4,
          },
        }),
      ],
      testUser({ preferences: { ...testUser().preferences, displayCurrency: 'CNY' } }),
    );

    await user.click(picker());
    expect(await screen.findByRole('option', { name: 'CNY – Chinese yuan' })).toBeInTheDocument();
  });

  it('shows the display currency while the list is still loading', () => {
    renderPicker([reply('GET /api/v1/me/display-currencies', () => new Promise<never>(() => {}))]);

    expect(picker().textContent).toBe('USD');
  });

  it('saves the chosen currency as display currency and asks every page again (FR-002, SC-005, D-413)', async () => {
    const { user, api, queryClient } = renderPicker([
      reply('PATCH /api/v1/me/preferences', {
        body: { ...testUser().preferences, displayCurrency: 'EUR' },
      }),
    ]);
    queryClient.setQueryData(['home', 'summary', 'myTeams'], { scope: 'myTeams' });
    queryClient.setQueryData(['reports', 'frame', 'summary', ''], { filter: {} });

    await choose(user, picker(), 'EUR – Euro');

    await waitFor(() =>
      expect(queryClient.getQueryData<CurrentUser>(SESSION_KEY)?.preferences.displayCurrency).toBe(
        'EUR',
      ),
    );
    expect(api.bodiesOf('PATCH /api/v1/me/preferences')).toEqual([{ displayCurrency: 'EUR' }]);
    expect(queryClient.getQueryState(['home', 'summary', 'myTeams'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['reports', 'frame', 'summary', ''])?.isInvalidated).toBe(
      true,
    );
    expect(picker()).toHaveTextContent(/^EUR$/);
  });

  it('says when the choice could not be saved, goes back, and saves on Try again (FR-002)', async () => {
    let attempts = 0;
    const { user, api } = renderPicker([
      reply('PATCH /api/v1/me/preferences', () =>
        ++attempts === 1
          ? { status: 500 }
          : { body: { ...testUser().preferences, displayCurrency: 'EUR' } },
      ),
    ]);
    await choose(user, picker(), 'EUR – Euro');

    const messages = await findMessages();
    expect(messages).toHaveTextContent("Your choice couldn't be saved.");
    expect(picker()).toHaveTextContent(/^USD$/);

    await user.click(within(messages).getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(picker()).toHaveTextContent(/^EUR$/));
    expect(api.bodiesOf('PATCH /api/v1/me/preferences')).toEqual([
      { displayCurrency: 'EUR' },
      { displayCurrency: 'EUR' },
    ]);
  });
});
