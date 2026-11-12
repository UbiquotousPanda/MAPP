import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { currentRates } from '@/testing/fixtures/line-item-forms';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { testUser } from '@/testing/fixtures/users';
import { ConvertedAmount } from './ConvertedAmount';

const pounds = { amount: '600000.00', currency: 'GBP' };
const dollars = { amount: '759493.67', currency: 'USD' };

describe('ConvertedAmount', () => {
  it('names the rate and its date from the API in the converted amount’s tooltip (D-418)', async () => {
    mockApi([reply('GET /api/v1/exchange-rates/current', { body: currentRates() })]);
    const { user } = renderWithProviders(<ConvertedAmount primary={pounds} secondary={dollars} />, {
      user: testUser(),
    });

    expect(screen.getByText('£600,000.00')).toBeVisible();
    const converted = screen.getByRole('button', { name: /about \$759,493\.67/ });
    await user.tab();
    expect(converted).toHaveFocus();

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      "In USD at today's rate (1 USD = 0.79 GBP · rate of 01 Mar 2026 · GSAP import)",
    );
  });

  it('shows one amount and no tooltip when the currencies match (D-418)', () => {
    renderWithProviders(<ConvertedAmount primary={dollars} secondary={dollars} />, {
      user: testUser(),
    });

    expect(screen.getByText('$759,493.67')).toBeVisible();
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
