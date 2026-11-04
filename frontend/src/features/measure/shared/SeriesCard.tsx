import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import type { SummaryCardProps } from '@/ui/SummaryCard/SummaryCard';
import styles from './SeriesCard.module.css';

export type Series = 'budget' | 'goal' | 'planned' | 'projected' | 'committed' | 'actual';

/** A summary card marked with the colour its figure has in the report's chart, so card and chart read as one. */
export function SeriesCard({ series, ...card }: SummaryCardProps & { series: Series }) {
  return (
    <div className={`${styles.card} ${styles[series]}`}>
      <SummaryCard {...card} />
    </div>
  );
}
