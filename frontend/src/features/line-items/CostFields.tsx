import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import { problemOf } from '@/ui/FormPanel/problem-of';
import { MoneyField } from '@/ui/MoneyField/MoneyField';
import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import { FieldHelpTip, useFieldHelp } from '@/features/settings';
import { formatRate } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import styles from './LineItemForm.module.css';
import { rateOf } from './line-item-form-state';
import type { LineItemFormState } from './line-item-form-state';
import { moneyText } from './line-item-math';
import type { LineItemCurrency, Money } from './api';
import {
  CALCULATED,
  conversionText,
  currencyLabel,
  inactiveCurrencyNote,
  LABEL,
  rateDatesText,
} from './line-item-text';
import { useCurrentRates } from './rates';

export interface CostFieldsProps {
  state: LineItemFormState;
  /** The active currencies and, on an edit form, the line item's inactive one. */
  currencies: LineItemCurrency[];
  problems: FieldProblem[];
  planCode?: string;
  /** The planned cost in the plan currency, worked out by the API; null while it can't be. */
  converted: Money | null;
  onCurrencyChange: (code: string) => void;
  onPlannedCostChange: (text: string) => void;
}

/** Currency and planned cost, with the calculated amount in the plan currency under another currency's. */
export function CostFields({
  state,
  currencies,
  problems,
  planCode = 'USD',
  converted,
  onCurrencyChange,
  onPlannedCostChange,
}: CostFieldsProps) {
  const currency = currencies.find((candidate) => candidate.code === state.currency);
  const planRate = rateOf(currencies, planCode);
  const converts = Boolean(currency && currency.code !== planCode && converted && planRate);
  const costNote =
    state.costNotes.length > 0 ? state.costNotes.join(' ') : state.sources.plannedCost;
  const { help } = useFieldHelp();

  return (
    <>
      <ChoiceField
        label={LABEL.currency}
        tip={help('lineItem.currency')}
        name="currency"
        marking="Required"
        options={currencies.map((option) => ({
          id: option.code,
          label: currencyLabel(option.code, option.name, true),
          active: option.active,
        }))}
        value={state.currency}
        onChange={onCurrencyChange}
        error={problemOf(problems, 'currency')}
        note={
          currency && !currency.active
            ? inactiveCurrencyNote(currency.code, formatRate(currency.ratePerUsd))
            : undefined
        }
      />
      <div>
        <MoneyField
          label={LABEL.plannedCost}
          tip={help('lineItem.plannedCost')}
          name="plannedCost"
          marking="Required"
          currency={state.currency}
          value={state.plannedCost}
          onChange={onPlannedCostChange}
          error={problemOf(problems, 'plannedCost')}
          note={costNote}
        />
        {converts && currency && converted && planRate && (
          <Conversion
            converted={converted}
            from={currency}
            planCode={planCode}
            planRate={planRate}
          />
        )}
      </div>
    </>
  );
}

/** "Calculated = £19,750.00 at 0.92 EUR and 0.79 GBP per USD (rates of 19 Oct 2026)". */
function Conversion({
  converted,
  from,
  planCode,
  planRate,
}: {
  converted: Money;
  from: LineItemCurrency;
  planCode: string;
  planRate: string;
}) {
  const { date } = useFormatters();
  const rates = useCurrentRates();
  const parts = [
    { code: from.code, rate: from.ratePerUsd },
    { code: planCode, rate: planRate },
  ].filter((part) => part.code !== 'USD');
  const dates = parts.map(
    (part) => rates.data?.items.find((item) => item.currency === part.code)?.rateDate ?? null,
  );
  const knownDates = dates.filter((day) => day !== null);
  const known =
    knownDates.length === dates.length ? rateDatesText(knownDates.map((day) => date(day))) : null;
  return (
    <p className={styles.conversion}>
      <span className={styles.calculated}>{CALCULATED}</span>
      <span>
        {conversionText(
          moneyText(converted),
          parts.map((part) => ({ rate: formatRate(part.rate), code: part.code })),
          known,
        )}
      </span>
      <FieldHelpTip
        helpKey={planCode === 'USD' ? 'lineItem.plannedCostUsd' : 'lineItem.plannedCostPlan'}
        label={`the calculated ${planCode} amount`}
      />
    </p>
  );
}
