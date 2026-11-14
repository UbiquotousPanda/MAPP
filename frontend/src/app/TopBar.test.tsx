import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import type { CurrentUser } from '@/session/useSession';
import { testUser } from '@/testing/fixtures/users';
import { DISPLAY_CURRENCIES } from '@/testing/fixtures/home';
import { mockApi } from '@/testing/mock-api';
import { reply } from '@/testing/replies';
import { TopBar } from './TopBar';

const PRIYA: CurrentUser = testUser();

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('TopBar', () => {
  it('is the page banner with the logo, which leads Home (FR-010)', () => {
    renderWithProviders(<TopBar />, { user: PRIYA });

    const bar = screen.getByRole('banner');
    expect(within(bar).getByRole('link', { name: 'SP&A One home' })).toHaveAttribute('href', '/');
  });

  it('has the theme switch, the bell and the account button on the right (FR-010)', () => {
    renderWithProviders(<TopBar />, { user: PRIYA });

    const bar = screen.getByRole('banner');
    expect(within(bar).getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Priya — account menu' })).toHaveTextContent(
      'Priya',
    );
  });

  it('has the display currency just before the theme switch, showing its code (D-413)', async () => {
    mockApi([
      reply('GET /api/v1/me/display-currencies', {
        body: { items: DISPLAY_CURRENCIES, total: DISPLAY_CURRENCIES.length },
      }),
    ]);
    renderWithProviders(<TopBar />, { user: PRIYA });

    const bar = screen.getByRole('banner');
    const currency = await within(bar).findByRole('combobox', { name: 'Display currency' });
    expect(currency).toHaveTextContent(/^USD$/);
    const theme = within(bar).getByRole('button', { name: 'Switch to dark mode' });
    expect(currency.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
