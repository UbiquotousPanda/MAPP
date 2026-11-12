import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formOptions, preview } from '@/testing/fixtures/line-item-forms';
import { findNameField, renderCreatePage } from '@/testing/fixtures/line-item-pages';
import { reply } from '@/testing/replies';
import { choose } from '@/testing/select';

describe('LineItemCreatePage, cost and currency (US2)', () => {
  it('converts the balance when the currency changes and shows the USD amount live (scenario 2, FR-011, FR-012)', async () => {
    const usd = (amount: string) => ({ amount, currency: 'USD' });
    const { user, api } = renderCreatePage([
      reply('POST /api/v1/activities/{activityId}/line-items/preview', {
        body: preview({
          plannedCostPlan: usd('10869.57'),
          afterSaving: usd('9130.43'),
          balanceIn: { amount: '18400.00', currency: 'EUR' },
          balanceInPlan: usd('20000.00'),
        }),
      }),
    ]);
    await findNameField();

    await choose(user, screen.getByLabelText('Currency'), /^EUR/);
    const cost = screen.getByLabelText('Planned cost');
    await waitFor(() => expect(cost).toHaveValue('18,400.00'));
    expect(screen.getByText('Changed to €18,400.00 = $20,000.00')).toBeInTheDocument();

    await user.clear(cost);
    await user.type(cost, '10000');
    expect(
      await screen.findByText(/^= \$10,869\.57 at 0\.92 EUR per USD \(rate of 0?1 Mar 2026\)$/),
    ).toBeInTheDocument();
    expect(screen.getByText('Calculated')).toBeInTheDocument();
    expect(screen.getByLabelText('Activity summary')).toHaveTextContent('After saving$9,130.43');
    await waitFor(() =>
      expect(
        api.bodiesOf('POST /api/v1/activities/A-1001/line-items/preview').at(-1),
      ).toMatchObject({
        currency: 'EUR',
        plannedCost: '10000.00',
      }),
    );
  });

  it('calculates in the plan currency of a GBP plan, with both rates and their date (016 FR-009, FR-015)', async () => {
    const gbp = (amount: string) => ({ amount, currency: 'GBP' });
    const { user } = renderCreatePage([
      reply('POST /api/v1/activities/{activityId}/line-items/preview', {
        body: preview({
          plannedCostPlan: gbp('19750.00'),
          afterSaving: gbp('5250.00'),
          balanceIn: { amount: '29113.92', currency: 'EUR' },
          balanceInPlan: gbp('25000.00'),
        }),
      }),
      reply(
        'GET /api/v1/activities/{activityId}/line-items/form-options',
        {
          body: formOptions({
            balance: {
              plannedCost: gbp('40000.00'),
              assigned: gbp('15000.00'),
              balance: gbp('25000.00'),
              state: 'left',
              roundingHint: false,
            },
            defaults: {
              ...formOptions().defaults,
              currency: 'GBP',
              plannedCost: gbp('25000.00'),
            },
          }),
        },
        { activityId: 'A-1001' },
      ),
    ]);
    await findNameField();

    // The pre-filled balance keeps its plan-currency value in another currency.
    await choose(user, screen.getByLabelText('Currency'), /^EUR/);
    const cost = screen.getByLabelText('Planned cost');
    await waitFor(() => expect(cost).toHaveValue('29,113.92'));
    expect(screen.getByText('Changed to €29,113.92 = £25,000.00')).toBeInTheDocument();

    await user.clear(cost);
    await user.type(cost, '23000');
    expect(
      await screen.findByText(
        /^= £19,750\.00 at 0\.92 EUR and 0\.79 GBP per USD \(rates of 0?1 Mar 2026\)$/,
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Activity summary')).toHaveTextContent('After saving£5,250.00'),
    );
  });

  it('shows no After saving figure while the API works out none (D-061)', async () => {
    const jpy = (amount: string) => ({ amount, currency: 'JPY' });
    renderCreatePage([
      reply(
        'GET /api/v1/activities/{activityId}/line-items/form-options',
        {
          body: formOptions({
            balance: {
              plannedCost: jpy('400000.00'),
              assigned: jpy('150000.00'),
              balance: jpy('250000.00'),
              state: 'left',
              roundingHint: false,
            },
          }),
        },
        { activityId: 'A-1001' },
      ),
    ]);
    await findNameField();

    expect(screen.getByLabelText('Activity summary')).toHaveTextContent('After saving—');
  });
});
