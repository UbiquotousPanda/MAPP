import { Info } from 'lucide-react';
import { Link } from 'react-router';
import { useFormatters } from '@/format/useFormatters';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import type { RevenueSectionData } from './api';
import { varianceText } from '../revenue/variance';
import { STAGE, STATE_TEXT, percentText } from './words';
import styles from './Summary.module.css';

const COVERAGE_TIP =
  "The activities' goals ÷ the plans' goals per stage: how much of each plan's goal is planned in activities. It is not performance.";

/** Revenue against goal: the fixed cards and how much of the goals activities plan. */
export function RevenueSection({
  revenue,
  states,
}: {
  revenue: RevenueSectionData;
  states: string[];
}) {
  const { money } = useFormatters();
  const coverage = revenue.goalCoverage
    .map((c) => `${STAGE[c.stage]} ${percentText(c.percent)}`)
    .join(' · ');
  return (
    <section className={styles.section} aria-labelledby="summary-revenue">
      <div className={styles.sectionHead}>
        <SectionHeading level={2} rank="section" id="summary-revenue">
          Revenue
        </SectionHeading>
      </div>
      {states.map((state) => (
        <p key={state} className={styles.state} role="status">
          <Info aria-hidden="true" />
          <span>
            {STATE_TEXT[state] ?? state}{' '}
            {state === 'nothingMatches' && (
              <Link className={styles.link} to="/reports/performance">
                Reset the filters
              </Link>
            )}
          </span>
        </p>
      ))}
      <StatStrip label="Revenue figures">
        <SummaryCard
          label="Actual or projected"
          value={revenue.actualOrProjected ? money(revenue.actualOrProjected) : '—'}
          tip="Actual to the end of the last month, projected from the month in progress on."
        />
        <SummaryCard
          label="Revenue goal"
          value={revenue.goal ? money(revenue.goal) : '—'}
          tip="The sum of the goals of the activities in view."
        />
        <SummaryCard
          label="Performance"
          value={percentText(revenue.performance)}
          detail={varianceText(revenue.variance)}
          tip="Actual or projected ÷ goal, as a whole per cent."
        />
      </StatStrip>
      <p className={styles.coverage}>
        <span className={styles.coverageLabel}>Goals planned in activities</span>
        <span>{coverage}</span>
        <InfoTip label="Goals planned in activities" text={COVERAGE_TIP} />
      </p>
    </section>
  );
}
