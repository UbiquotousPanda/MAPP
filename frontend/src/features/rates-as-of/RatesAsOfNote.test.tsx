import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatTime } from '@/format/intl';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { activityRecord } from '@/testing/fixtures/line-item-financials';
import { currentRates } from '@/testing/fixtures/line-item-forms';
import { reply } from '@/testing/replies';
import { ActivityFinancials } from '@/features/line-items';

describe('GSAP rates as of beside converted amounts (issue 183)', () => {
  it('names the rates time in the footer of the activity Financials card', async () => {
    const rates = currentRates();
    mockApi([
      reply(
        'GET /api/v1/financials/records/{recordId}',
        { body: activityRecord() },
        { recordId: 'A-1001' },
      ),
      reply('GET /api/v1/exchange-rates/current', { body: rates }),
    ]);

    renderWithProviders(<ActivityFinancials activityId="A-1001" />, { user: testUser() });

    expect(
      await screen.findByText(`GSAP rates as of ${formatTime(rates.asOf)}`),
    ).toBeInTheDocument();
  });
});
