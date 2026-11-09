import { useFormatters } from '@/format/useFormatters';
import type { AttributionModelChoice, Deal, DealActivity } from './api';
import { JourneySteps } from './JourneySteps';
import styles from './Deals.module.css';

interface DealCardProps {
  deal: Deal;
  activity: DealActivity;
  comparison: AttributionModelChoice | null;
}

/** One deal: what was booked, where and when, how the model shared it, and this activity's share. */
export function DealCard({ deal, activity, comparison }: DealCardProps) {
  const { money, date } = useFormatters();
  const bookedHere = deal.bookedOn.id === activity.id;
  const title = `${deal.source} · ${deal.reference}`;
  return (
    <article className={styles.deal} aria-label={title}>
      <header className={styles.dealHeader}>
        <h3 className={styles.dealTitle}>{title}</h3>
        <span className={styles.dealAmount}>
          {money(deal.amount)}
          {deal.rate && (
            <span className={styles.converted}>
              {' '}
              = {money(deal.usd)} at {deal.rate}
            </span>
          )}
        </span>
      </header>
      <p className={styles.meta}>
        {date(deal.date)} · booked on {bookedHere ? 'this activity' : deal.bookedOn.name}
      </p>
      <p className={styles.how}>{howShared(deal, bookedHere)}</p>
      {deal.journey === 'shared' && <JourneySteps deal={deal} comparison={comparison !== null} />}
      <p className={styles.share}>
        <span>This activity's share</span>
        <strong>{money(deal.share)}</strong>
        {comparison && deal.comparisonShare && (
          <span className={styles.compare}>
            {money(deal.comparisonShare)} under {comparison.name}
          </span>
        )}
      </p>
    </article>
  );
}

function howShared(deal: Deal, bookedHere: boolean): string {
  switch (deal.journey) {
    case 'none':
      return 'No journey recorded, so it stays with the activity that booked it.';
    case 'unattributed':
      return 'No step came before this deal, so nobody is credited: it counts as Unattributed.';
    default: {
      const n = deal.steps.length;
      const steps = n === 1 ? 'its one step' : `its ${n} steps`;
      return bookedHere
        ? `Shared between ${steps}; booking it earns this activity nothing.`
        : `Shared between ${steps}.`;
    }
  }
}
