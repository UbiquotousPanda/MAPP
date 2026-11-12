import { useState } from 'react';
import { Link } from 'react-router';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '@/ui/Button/Button';
import { cx } from '@/ui/cx';
import { recordHref } from '@/ui/record-links';
import { Tag } from '@/ui/Tag/Tag';
import type { Deal, DealStep } from './api';
import styles from './Deals.module.css';

const FOLD_AFTER = 5;

const KIND_WORDS: Record<string, string> = {
  inq: 'INQ',
  mql: 'MQL',
  sessions: 'Sessions',
  visits: 'Visits',
  engagementTouches: 'Engagement touches',
};

function kindsText(kinds: string[]): string {
  return kinds.map((k) => KIND_WORDS[k] ?? k).join(' + ');
}

interface JourneyStepsProps {
  deal: Deal;
  /** Shows each step's share under the comparison model after its own. */
  comparison: boolean;
}

/** A deal's sharing steps in date order, this activity's marked, then the deal itself, which earns nothing. */
export function JourneySteps({ deal, comparison }: JourneyStepsProps) {
  const { money, date } = useFormatters();
  const [showAll, setShowAll] = useState(false);
  const folded = !showAll && deal.steps.length > FOLD_AFTER;
  const shown = folded ? deal.steps.filter((s, i) => i < FOLD_AFTER || s.thisActivity) : deal.steps;
  return (
    <div>
      <ol className={styles.steps} aria-label="Journey">
        {shown.map((s) => (
          <li key={stepKey(s)} className={cx(styles.step, s.thisActivity && styles.here)}>
            <span className={styles.kind}>{kindsText(s.kinds)}</span>
            <span className={styles.who}>
              <Link to={recordHref('activity', s.activity.id, s.activity.planId)}>
                {s.activity.name}
              </Link>
              {s.thisActivity && <Tag>This activity</Tag>}
            </span>
            <span className={styles.when}>{date(s.date)}</span>
            <span className={styles.amount}>
              {money(s.share)}
              {comparison && s.comparisonShare && (
                <span className={styles.compare}> · {money(s.comparisonShare)}</span>
              )}
            </span>
          </li>
        ))}
        <li className={cx(styles.step, styles.booked)}>
          <span className={styles.kind}>Deal booked</span>
          <span className={styles.who}>{deal.bookedOn.name}</span>
          <span className={styles.when}>{date(deal.date)}</span>
          <span className={styles.amount}>—</span>
        </li>
      </ol>
      {folded && (
        <Button size="sm" variant="tertiary" onClick={() => setShowAll(true)}>
          Show all {deal.steps.length} steps
        </Button>
      )}
    </div>
  );
}

function stepKey(s: DealStep): string {
  return `${s.activity.id}-${s.date}`;
}
