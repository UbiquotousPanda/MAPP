import { useId, useState } from 'react';
import { DecimalField } from '@/ui/DecimalField/DecimalField';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { formatMoneyText, formatWhole, parseWholeInput } from '@/format/decimal';
import { plural } from '@/format/text';
import { waterfall } from './waterfall';
import styles from './WaterfallExample.module.css';

const MAX_INQUIRIES = 1_000_000_000n;

export interface WaterfallExampleProps {
  /** The INQ→MQL rate as a percentage ("2", "2.00"); null when it is not filled in or not a rate. */
  inqToMqlRate: string | null;
  mqlToDealRate: string | null;
  averageDealSize: string | null;
  /** The velocities as typed, in whole months; null when not a whole number. */
  inqToMqlVelocityMonths: number | null;
  mqlToDealVelocityMonths: number | null;
}

function placement(months: number | null): string {
  if (months === null || months === 0) {
    return '';
  }
  return ` ${plural(months, 'month')} later`;
}

/** Worked out as goals are (waterfall.ts); changing the example number of inquiries saves nothing. */
export function WaterfallExample({
  inqToMqlRate,
  mqlToDealRate,
  averageDealSize,
  inqToMqlVelocityMonths,
  mqlToDealVelocityMonths,
}: WaterfallExampleProps) {
  const titleId = useId();
  const [inquiries, setInquiries] = useState('250,000');
  const inq = parseWholeInput(inquiries);
  const inqValid = inq !== null && inq >= 0n && inq <= MAX_INQUIRIES;

  let result: string | null = null;
  if (inqValid) {
    if (inqToMqlRate === null || mqlToDealRate === null || averageDealSize === null) {
      result = 'Fill in both rates and the average deal size to see the example.';
    } else {
      const goals = waterfall(inq, {
        inqToMqlRate,
        mqlToDealRate,
        averageDealSize: { amount: averageDealSize },
      });
      result =
        goals === 'tooLarge'
          ? 'Too large to calculate — try fewer inquiries.'
          : `${formatWhole(inq)} INQ → ${formatWhole(goals.mql)} MQL${placement(inqToMqlVelocityMonths)} → ` +
            `${plural(goals.deals, 'deal')}${placement(mqlToDealVelocityMonths)} → ` +
            `${formatMoneyText({ amount: goals.revenue, currency: 'USD' })} revenue`;
    }
  }

  return (
    <section aria-labelledby={titleId} className={styles.example}>
      <div className={styles.header}>
        <h3 id={titleId} className={styles.title}>
          Worked example
        </h3>
        <InfoTip
          label="Worked example"
          text="MQL = inquiries × INQ→MQL rate and deals = MQL × MQL→deal rate, each rounded to a whole number; revenue = deals × average deal size. Each velocity says how many months later a stage lands."
        />
        <span className={styles.calculated}>Calculated — not saved</span>
      </div>
      <DecimalField
        label="Example number of inquiries"
        name="exampleInquiries"
        decimals={0}
        value={inquiries}
        onChange={setInquiries}
        error={inqValid ? undefined : 'Enter a whole number from 0 to 1,000,000,000.'}
      />
      <output className={styles.result} aria-labelledby={titleId}>
        {result}
      </output>
    </section>
  );
}
