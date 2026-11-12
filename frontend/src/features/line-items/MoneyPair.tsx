import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { cx } from '@/ui/cx';
import { useFormatters } from '@/format/useFormatters';
import { moneyText } from './line-item-math';
import type { Money } from './api';
import styles from './MoneyPair.module.css';
import { factsOf, RATES_UNKNOWN, rateText, useCurrentRates } from './rates';

export interface MoneyPairProps {
  primary: Money | null | undefined;
  secondary?: Money | null;
  problem?: boolean;
}

/** "£40,000.00 ≈ $50,632.91": the display-currency amount muted, with an ⓘ naming the rates. */
export function MoneyPair({ primary, secondary, problem = false }: MoneyPairProps) {
  const both = Boolean(primary && secondary && secondary.currency !== primary.currency);
  return (
    <span className={styles.pair}>
      <span className={cx(styles.primary, problem && styles.problem)}>
        {primary ? moneyText(primary) : '—'}
      </span>
      {both && primary && secondary && (
        <span className={styles.secondary}>
          ≈ {moneyText(secondary)}
          <RateTip codes={[primary.currency, secondary.currency]} />
        </span>
      )}
    </span>
  );
}

/** "1 USD = 0.79 GBP · rate of 19 Oct 2026 · GSAP import" for each currency other than USD. */
export function RateTip({ codes }: { codes: string[] }) {
  const { date } = useFormatters();
  const rates = useCurrentRates();
  const lines = codes
    .filter((code) => code !== 'USD')
    .map((code) => {
      const rate = rates.data?.items.find((item) => item.currency === code);
      return rate ? rateText(factsOf(rate), date) : null;
    });
  const text =
    lines.length > 0 && lines.every((line) => line !== null) ? lines.join('; ') : RATES_UNKNOWN;
  return <InfoTip label="the rates used" text={text} />;
}
