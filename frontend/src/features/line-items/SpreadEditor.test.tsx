import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from 'radix-ui';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { EUR, eur, lineItem, spreadMonth, usd } from '@/testing/fixtures/line-items';
import { formOptions } from '@/testing/fixtures/line-item-forms';
import {
  addCustomMonth,
  changeCustomMonth,
  changePlannedCost,
  changeSpreadMethod,
  editFormState,
  newFormState,
} from './line-item-form-state';
import type { LineItemFormState } from './line-item-form-state';
import type { ActivityDates } from './line-item-math';
import { SpreadEditor } from './SpreadEditor';
import type { SpreadEditorProps } from './SpreadEditor';

type Spread = SpreadEditorProps['spread'];

const MAR_MAY: ActivityDates = { startDate: '2026-03-01', endDate: '2026-05-31', ongoing: false };

function tenThousandEuros(): LineItemFormState {
  return { ...newFormState(formOptions()), currency: 'EUR', plannedCost: '10,000.00' };
}

const EVENLY_SEED = [
  { month: '2026-03', amount: '3333.33' },
  { month: '2026-04', amount: '3333.33' },
  { month: '2026-05', amount: '3333.34' },
];

/** The API's answer for a spread: its months in euros, and what a switch to Custom starts from. */
function answered(
  months: [string, string][],
  state: 'spread' | 'notSpread' = 'spread',
): NonNullable<Spread> {
  return {
    state,
    months: months.map(([month, amount]) => spreadMonth(month, eur(amount), usd(amount))),
    customTotal: null,
    difference: null,
    addsUp: true,
    seed: EVENLY_SEED,
  };
}

function customAnswer(total: string, difference: string): Spread {
  return {
    ...answered([]),
    customTotal: eur(total),
    difference: eur(difference),
    addsUp: difference === '0.00',
  };
}

function Harness({
  start,
  dates = MAR_MAY,
  spread,
}: {
  start: LineItemFormState;
  dates?: ActivityDates;
  spread?: Spread;
}) {
  const [state, setState] = useState(start);
  return (
    <Tooltip.Provider>
      <SpreadEditor
        method={state.spreadMethod}
        plannedCost={state.plannedCost}
        currency={state.currency}
        dates={dates}
        customMonths={state.customMonths}
        spread={spread}
        customTyped={state.customTyped}
        problems={[]}
        onMethodChange={(method) =>
          setState((s) => changeSpreadMethod(s, method, dates, 2026, spread?.seed))
        }
        onMonthChange={(month, amount) => setState((s) => changeCustomMonth(s, month, amount))}
        onAddMonth={(month) => setState((s) => addCustomMonth(s, month))}
        onUseTotal={(amount) => setState((s) => changePlannedCost(s, amount))}
      />
      <output aria-label="Planned cost now">{state.plannedCost}</output>
    </Tooltip.Provider>
  );
}

function preview() {
  return screen.getByRole('list', { name: 'Preview of the spread' }).textContent;
}

describe('038 FR-042 (L-7): pasting a row of amounts', () => {
  it('fills the month and the ones after it, and says what did not fit', async () => {
    const user = userEvent.setup();
    const start = changeSpreadMethod(tenThousandEuros(), 'custom', MAR_MAY, 2026, EVENLY_SEED);
    renderWithProviders(<Harness start={start} />);

    await user.click(screen.getByRole('textbox', { name: /Mar 2026/ }));
    await user.paste('1000\t2000\t3000\t4000');

    expect(screen.getByRole('textbox', { name: /Mar 2026/ })).toHaveValue('1000.00');
    expect(screen.getByRole('textbox', { name: /Apr 2026/ })).toHaveValue('2000.00');
    expect(screen.getByRole('textbox', { name: /May 2026/ })).toHaveValue('3000.00');
    expect(
      screen.getByText('1 pasted value was left out: there is no month after May 2026.'),
    ).toBeInTheDocument();
  });
});

describe('SpreadEditor (US3, FR-017 – FR-021)', () => {
  it('shows the months the API spread the cost over (scenario 1, D-061)', () => {
    const spread = answered([
      ['2026-03', '3333.33'],
      ['2026-04', '3333.33'],
      ['2026-05', '3333.34'],
    ]);
    renderWithProviders(<Harness start={tenThousandEuros()} spread={spread} />);

    expect(screen.getByRole('radio', { name: 'Evenly' })).toBeChecked();
    expect(preview()).toBe('Mar 2026 · €3,333.33Apr 2026 · €3,333.33May 2026 · €3,333.34');
  });

  it('starts Custom from the seed the API answers (scenario 2, D-152)', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness start={tenThousandEuros()} spread={answered([['2026-03', '10000.00']])} />,
    );

    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(screen.getByLabelText('Amount for Mar 2026')).toHaveValue('3,333.33');
    expect(screen.getByLabelText('Amount for May 2026')).toHaveValue('3,333.34');
  });

  it('shows the custom total the API answers and uses it as the planned cost (FR-018)', async () => {
    const user = userEvent.setup();
    const start = changeSpreadMethod(tenThousandEuros(), 'custom', MAR_MAY, 2026, EVENLY_SEED);
    renderWithProviders(<Harness start={start} spread={customAnswer('12000.00', '-2000.00')} />);

    expect(
      screen.getByText('€12,000.00 of €10,000.00 spread — €2,000.00 too much'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use month total as planned cost' }));
    expect(screen.getByLabelText('Planned cost now')).toHaveTextContent('12,000.00');
  });

  it('says what is left to spread (FR-018)', () => {
    const start = changeSpreadMethod(tenThousandEuros(), 'custom', MAR_MAY, 2026, EVENLY_SEED);
    renderWithProviders(<Harness start={start} spread={customAnswer('8000.00', '2000.00')} />);

    expect(screen.getByText('€8,000.00 of €10,000.00 spread — €2,000.00 left')).toBeInTheDocument();
  });

  it('says that an ongoing activity puts everything in its first month (scenario 4, FR-021)', async () => {
    const user = userEvent.setup();
    const ongoing = { startDate: '2026-03-15', endDate: null, ongoing: true };
    const spread = answered([['2026-03', '10000.00']]);
    renderWithProviders(<Harness start={tenThousandEuros()} dates={ongoing} spread={spread} />);

    expect(
      screen.getByText(
        "This activity is ongoing (no end date), so 'Evenly' puts everything in the first month — choose Custom to spread it",
      ),
    ).toBeInTheDocument();
    expect(preview()).toBe('Mar 2026 · €10,000.00');
    await user.click(screen.getByRole('radio', { name: 'All in last month' }));
    expect(
      screen.getByText(
        "This activity is ongoing (no end date), so 'All in last month' puts everything in the first month — choose Custom to spread it",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(screen.getByLabelText('Amount for Dec 2026')).toBeInTheDocument();
  });

  it('says when the activity has no dates yet (FR-017)', () => {
    renderWithProviders(
      <Harness
        start={tenThousandEuros()}
        dates={{ startDate: null, endDate: null, ongoing: false }}
        spread={answered([], 'notSpread')}
      />,
    );

    expect(
      screen.getByText("Not spread yet — add the activity's dates to see the spread"),
    ).toBeInTheDocument();
  });

  it('says that leaving Custom replaces the typed amounts (scenario 6, D-151)', async () => {
    const user = userEvent.setup();
    const custom = editFormState(
      lineItem({
        currency: EUR,
        plannedCost: eur('10000.00'),
        spread: {
          method: 'custom',
          state: 'spread',
          months: [spreadMonth('2026-03', eur('10000.00'), usd('10869.57'))],
          customTotal: eur('10000.00'),
          addsUp: true,
        },
      }),
    );
    renderWithProviders(<Harness start={custom} />);

    expect(
      screen.queryByText(
        'The month amounts you typed will be replaced by this spread when you save.',
      ),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Evenly' }));
    expect(
      screen.getByText(
        'The month amounts you typed will be replaced by this spread when you save.',
      ),
    ).toBeInTheDocument();
  });
});
