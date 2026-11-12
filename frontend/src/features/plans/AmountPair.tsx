import type { components } from '@/api/generated/schema';
import { formatMoneyText } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import styles from './AmountPair.module.css';
import { differentCurrency } from './plan-currency';

type Money = components['schemas']['Money'];

export interface AmountPairProps {
  primary: Money | null | undefined;
  secondary?: Money | null;
  inline?: boolean;
  problem?: boolean;
}

/** "£600,000.00" with "≈ $759,493.67" in the reader's display currency, shown only when it differs. */
export function AmountPair({
  primary,
  secondary,
  inline = false,
  problem = false,
}: AmountPairProps) {
  const { money } = useFormatters();
  const both = differentCurrency(primary, secondary);
  if (!primary || !both || !secondary) {
    return <span className={problem ? styles.problem : undefined}>{money(primary)}</span>;
  }
  return (
    <span className={`${inline ? styles.inline : styles.stack} ${problem ? styles.problem : ''}`}>
      <span>{formatMoneyText(primary)}</span>
      <span className={styles.secondary}>
        <span aria-hidden="true">≈ </span>
        <span className="visually-hidden">about </span>
        {formatMoneyText(secondary)}
      </span>
    </span>
  );
}
