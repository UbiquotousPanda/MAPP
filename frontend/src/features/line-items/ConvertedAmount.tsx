import { formatMoneyText } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import { cx } from '@/ui/cx';
import type { Money } from './api';
import styles from './ConvertedAmount.module.css';
import { factsOf, RATES_UNKNOWN, rateText, useCurrentRates } from './rates';

export interface ConvertedAmountProps {
  primary: Money | null | undefined;
  /** The same amount in the reader's display currency, from the API; shown only when it differs. */
  secondary?: Money | null;
  inline?: boolean;
  problem?: boolean;
}

/** "£600,000.00" with "≈ $759,493.67" muted beneath (or beside), its tooltip naming the rate. */
export function ConvertedAmount({
  primary,
  secondary,
  inline = false,
  problem = false,
}: ConvertedAmountProps) {
  const { money } = useFormatters();
  if (!primary || !secondary || primary.currency === secondary.currency) {
    return <span className={cx(problem && styles.problem)}>{money(primary)}</span>;
  }
  return (
    <span className={cx(inline ? styles.inline : styles.stack, problem && styles.problem)}>
      <span>{formatMoneyText(primary)}</span>
      <Converted from={primary.currency} amount={secondary} />
    </span>
  );
}

export interface ConvertedProps {
  from: string;
  amount: Money;
}

/** Only the "≈ $759,493.67" part, for a place that already shows the original amount. */
export function Converted({ from, amount }: ConvertedProps) {
  const rates = useRatesText([from, amount.currency]);
  const content =
    rates === RATES_UNKNOWN
      ? `In ${amount.currency}. ${RATES_UNKNOWN}`
      : `In ${amount.currency} at today's rate (${rates})`;
  return (
    <Tooltip content={content}>
      <button type="button" className={styles.converted}>
        <span aria-hidden="true">≈ </span>
        <span className="visually-hidden">about</span> {formatMoneyText(amount)}
      </button>
    </Tooltip>
  );
}

export function RateTip({ codes }: { codes: string[] }) {
  return <InfoTip label="the rates used" text={useRatesText(codes)} />;
}

/** "1 USD = 0.79 GBP · rate of 19 Oct 2026 · GSAP import" for each currency other than USD. */
function useRatesText(codes: string[]): string {
  const { date } = useFormatters();
  const rates = useCurrentRates();
  const lines = codes
    .filter((code) => code !== 'USD')
    .map((code) => {
      const rate = rates.data?.items.find((item) => item.currency === code);
      return rate ? rateText(factsOf(rate), date) : null;
    });
  return lines.length > 0 && lines.every((line) => line !== null)
    ? lines.join('; ')
    : RATES_UNKNOWN;
}
