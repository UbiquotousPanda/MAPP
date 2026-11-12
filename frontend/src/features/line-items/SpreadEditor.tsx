import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { ClipboardEvent } from 'react';
import { Button } from '@/ui/Button/Button';
import { problemOf } from '@/ui/FormPanel/problem-of';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import { MoneyField } from '@/ui/MoneyField/MoneyField';
import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import { cx } from '@/ui/cx';
import { useFieldHelp } from '@/features/settings';
import { formatAmount, toCents } from '@/format/decimal';
import type { components } from '@/api/generated/schema';
import { monthFieldId } from './line-item-form-state';
import type { CustomMonth } from './line-item-form-state';
import { leftOutText, pastedValues } from './spread-paste';
import {
  addMonths,
  amountText,
  formatMonth,
  isOutsideDates,
  moneyText,
  parseAmount,
} from './line-item-math';
import type { ActivityDates, SpreadMethod } from './line-item-math';
import {
  ADD_MONTH_AFTER,
  ADD_MONTH_BEFORE,
  customTotalText,
  LABEL,
  LEAVING_CUSTOM,
  monthAmountLabel,
  NOT_SPREAD_YET,
  ONGOING_EVENLY,
  ONGOING_LAST,
  OUTSIDE_TIP,
  previewLine,
  SPREAD_LABELS,
  USE_MONTH_TOTAL,
} from './line-item-text';
import styles from './SpreadEditor.module.css';

type SpreadPreview = components['schemas']['SpreadPreview'];

const METHODS: SpreadMethod[] = ['evenly', 'firstMonth', 'lastMonth', 'custom'];

export interface SpreadEditorProps {
  method: SpreadMethod;
  /** The planned cost as typed. */
  plannedCost: string;
  currency: string;
  dates: ActivityDates;
  customMonths: CustomMonth[];
  /** The spread as the API works it out for the form; undefined until it answers. */
  spread: SpreadPreview | null | undefined;
  /** Custom amounts were typed or saved: leaving Custom says they will be replaced. */
  customTyped: boolean;
  problems: FieldProblem[];
  onMethodChange: (method: SpreadMethod) => void;
  onMonthChange: (month: string, amount: string) => void;
  onAddMonth: (month: string) => void;
  /** Sets the planned cost to the month total (FR-018). */
  onUseTotal: (amount: string) => void;
}

/**
 * Spread over time: Evenly, All in first month, All in last month (each with a preview of its months)
 * or Custom, a month grid with Add month before / after and the running total.
 */
export function SpreadEditor({
  method,
  plannedCost,
  currency,
  dates,
  customMonths,
  spread,
  customTyped,
  problems,
  onMethodChange,
  onMonthChange,
  onAddMonth,
  onUseTotal,
}: SpreadEditorProps) {
  const { help } = useFieldHelp();

  return (
    <div className={styles.editor}>
      <RadioGroup
        label={LABEL.spread}
        labelHidden
        tip={help('lineItem.spread')}
        name="spread"
        layout="row"
        options={METHODS.map((option) => ({ value: option, label: SPREAD_LABELS[option] }))}
        value={method}
        onChange={onMethodChange}
        error={problemOf(problems, 'spread')}
      />

      {method !== 'custom' && customTyped && <p className={styles.note}>{LEAVING_CUSTOM}</p>}

      {method === 'custom' ? (
        <CustomGrid
          plannedCost={amountText(parseAmount(plannedCost) ?? 0n, currency)}
          spread={spread}
          currency={currency}
          dates={dates}
          months={customMonths}
          problems={problems}
          onMonthChange={onMonthChange}
          onAddMonth={onAddMonth}
          onUseTotal={onUseTotal}
        />
      ) : (
        <Preview method={method} spread={spread} dates={dates} />
      )}
    </div>
  );
}

function Preview({
  method,
  spread,
  dates,
}: {
  method: Exclude<SpreadMethod, 'custom'>;
  spread: SpreadPreview | null | undefined;
  dates: ActivityDates;
}) {
  if (!spread) {
    return null;
  }
  if (spread.state === 'notSpread') {
    return <p className={styles.note}>{NOT_SPREAD_YET}</p>;
  }
  const ongoingNote =
    dates.ongoing && method === 'evenly'
      ? ONGOING_EVENLY
      : dates.ongoing && method === 'lastMonth'
        ? ONGOING_LAST
        : null;
  return (
    <>
      {ongoingNote && <p className={styles.note}>{ongoingNote}</p>}
      <ul className={styles.preview} aria-label="Preview of the spread">
        {spread.months.map(({ month, amount }) => (
          <li key={month}>{previewLine(formatMonth(month), moneyText(amount))}</li>
        ))}
      </ul>
    </>
  );
}

interface CustomGridProps {
  /** The planned cost as people read it, "€10,000.00". */
  plannedCost: string;
  spread: SpreadPreview | null | undefined;
  currency: string;
  dates: ActivityDates;
  months: CustomMonth[];
  problems: FieldProblem[];
  onMonthChange: (month: string, amount: string) => void;
  onAddMonth: (month: string) => void;
  onUseTotal: (amount: string) => void;
}

function CustomGrid({
  plannedCost,
  spread,
  currency,
  dates,
  months,
  problems,
  onMonthChange,
  onAddMonth,
  onUseTotal,
}: CustomGridProps) {
  const total = spread?.customTotal;
  const difference = spread?.difference ? toCents(spread.difference.amount) : 0n;
  const first = months[0]?.month;
  const last = months[months.length - 1]?.month;
  const [leftOut, setLeftOut] = useState<string | null>(null);

  // A row pasted from a spreadsheet fills this month and the ones after it.
  function paste(event: ClipboardEvent<HTMLDivElement>) {
    const name = event.target instanceof HTMLInputElement ? event.target.name : '';
    const index = months.findIndex(({ month }) => monthFieldId(month) === name);
    const values = pastedValues(event.clipboardData.getData('text'));
    if (index < 0 || !values) {
      return;
    }
    event.preventDefault();
    const following = months.slice(index);
    following.forEach(({ month }, offset) => {
      const value = values[offset];
      if (value !== undefined) {
        onMonthChange(month, value);
      }
    });
    const extra = values.length - following.length;
    setLeftOut(extra > 0 && last ? leftOutText(extra, last) : null);
  }

  return (
    <div className={styles.custom}>
      {leftOut && (
        <p className={styles.note} role="status">
          {leftOut}
        </p>
      )}
      <div className={styles.monthGrid} onPaste={paste}>
        {months.map(({ month, amount }) => {
          const outside = isOutsideDates(month, dates);
          return (
            <div key={month} className={cx(styles.month, outside && styles.outside)}>
              <span className={styles.monthName} aria-hidden="true">
                {formatMonth(month)}
              </span>
              <MoneyField
                label={monthAmountLabel(formatMonth(month))}
                labelHidden
                name={monthFieldId(month)}
                currency={currency}
                value={amount}
                onChange={(value) => onMonthChange(month, value)}
                error={problemOf(problems, monthFieldId(month))}
                note={outside ? OUTSIDE_TIP : undefined}
              />
            </div>
          );
        })}
      </div>
      <div className={styles.addMonths}>
        {first && (
          <Button size="sm" icon={<Plus />} onClick={() => onAddMonth(addMonths(first, -1))}>
            {ADD_MONTH_BEFORE}
          </Button>
        )}
        {last && (
          <Button size="sm" icon={<Plus />} onClick={() => onAddMonth(addMonths(last, 1))}>
            {ADD_MONTH_AFTER}
          </Button>
        )}
      </div>
      {total && (
        <p
          className={cx(styles.total, difference < 0n && styles.tooMuch)}
          role="status"
          aria-live="polite"
        >
          {customTotalText(moneyText(total), plannedCost, {
            sign: difference === 0n ? 0 : difference > 0n ? 1 : -1,
            amount: spread?.difference ? moneyText(unsigned(spread.difference)) : '',
          })}
        </p>
      )}
      {total && difference !== 0n && (
        <Button size="sm" onClick={() => onUseTotal(formatAmount(total.amount))}>
          {USE_MONTH_TOTAL}
        </Button>
      )}
    </div>
  );
}

function unsigned(money: SpreadPreview['customTotal'] & object) {
  return { ...money, amount: money.amount.replace(/^-/, '') };
}
