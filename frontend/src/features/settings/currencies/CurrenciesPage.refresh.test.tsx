import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { currentRates } from '@/testing/fixtures/line-item-forms';
import { renderCurrenciesPage } from '@/testing/fixtures/settings-pages';
import { reply } from '@/testing/replies';

const AS_OF = /GSAP rates as of \d{1,2}:\d{2}/;

describe('CurrenciesPage: refresh rates now (demo-mvp #10)', () => {
  it('shows when the GSAP rates are as of and refreshes them on request', async () => {
    const { user, api } = renderCurrenciesPage([
      reply('GET /api/v1/exchange-rates/current', { body: currentRates() }),
      reply('POST /api/v1/exchange-rates/refresh', {
        body: { ...currentRates(), asOf: '2026-03-12T09:15:00Z' },
      }),
    ]);

    expect(await screen.findByText(AS_OF)).toHaveTextContent('refreshed every 15 minutes');
    await user.click(screen.getByRole('button', { name: 'Refresh rates now' }));

    expect(await screen.findByText(/Rates refreshed\. GSAP rates as of/)).toBeInTheDocument();
    expect(api.bodiesOf('POST /api/v1/exchange-rates/refresh')).toHaveLength(1);
  });

  it('says so when the rates could not be refreshed', async () => {
    const { user } = renderCurrenciesPage([
      reply('GET /api/v1/exchange-rates/current', { body: currentRates() }),
      reply('POST /api/v1/exchange-rates/refresh', () => Promise.reject(new TypeError('offline'))),
    ]);

    await user.click(await screen.findByRole('button', { name: 'Refresh rates now' }));

    expect(await screen.findByText('The rates could not be refreshed. Try again.')).toBeVisible();
  });
});
