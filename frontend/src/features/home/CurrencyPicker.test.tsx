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

function renderPicker(answers: HttpHandler[] = [], user: CurrentUser = testUser()) {
  const api = mockApi([reply('GET /api/v1/me/display-currencies', CURRENCY_LIST), ...answers]);
  const rendered = renderWithProviders(<CurrencyPicker />, { user });
  return { ...rendered, api };
}

function picker() {
  return screen.getByRole('combobox', { name: 'Currency' });
}

describe('CurrencyPicker', () => {
  it('offers the currencies My profile offers and starts on the display currency (FR-002, US1 scenario 1, D-217)', async () => {
    const { user } = renderPicker();

    await waitFor(() => expect(picker()).toHaveTextContent('USD – US dollar'));
    await user.click(picker());
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'EUR – Euro',
      'GBP – Pound sterling',
      'USD – US dollar',
    ]);
  });

  it('keeps an inactive display currency in the list, because it stays in use (D-201)', async () => {
    renderPicker(
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

    await waitFor(() => expect(picker()).toHaveTextContent('CNY – Chinese yuan'));
  });

  it('shows the display currency while the list is still loading', () => {
    renderPicker([reply('GET /api/v1/me/display-currencies', () => new Promise<never>(() => {}))]);

    expect(picker().textContent).toBe('USD');
  });

  it('saves the chosen currency as display currency and asks every card again (FR-002, SC-005)', async () => {
    const { user, api, queryClient } = renderPicker([
      reply('PATCH /api/v1/me/preferences', {
        body: { ...testUser().preferences, displayCurrency: 'EUR' },
      }),
    ]);
    queryClient.setQueryData(['home', 'summary', 'myTeams'], { scope: 'myTeams' });
    await waitFor(() => expect(picker()).toHaveTextContent('USD – US dollar'));

    await choose(user, picker(), 'EUR – Euro');

    await waitFor(() =>
      expect(queryClient.getQueryData<CurrentUser>(SESSION_KEY)?.preferences.displayCurrency).toBe(
        'EUR',
      ),
    );
    expect(api.bodiesOf('PATCH /api/v1/me/preferences')).toEqual([{ displayCurrency: 'EUR' }]);
    expect(queryClient.getQueryState(['home', 'summary', 'myTeams'])?.isInvalidated).toBe(true);
    expect(picker()).toHaveTextContent('EUR – Euro');
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
    await waitFor(() => expect(picker()).toHaveTextContent('USD – US dollar'));

    await choose(user, picker(), 'EUR – Euro');

    const messages = await findMessages();
    expect(messages).toHaveTextContent("Your choice couldn't be saved.");
    expect(picker()).toHaveTextContent('USD – US dollar');

    await user.click(within(messages).getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(picker()).toHaveTextContent('EUR – Euro'));
    expect(api.bodiesOf('PATCH /api/v1/me/preferences')).toEqual([
      { displayCurrency: 'EUR' },
      { displayCurrency: 'EUR' },
    ]);
  });
});
