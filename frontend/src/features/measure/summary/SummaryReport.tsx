import { Link, useSearchParams } from 'react-router';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { ReportFrame } from '../shared';
import type { ReportAddress } from '../shared';
import { CategorySelect } from '../revenue/CategorySelect';
import { useSummaryReport } from './api';
import { FunnelSection } from './FunnelSection';
import { LeagueTable } from './LeagueTable';
import { RevenueSection } from './RevenueSection';
import { TABLES, readSummaryParams, writeSummaryParams } from './schemas';
import type { SummaryParams } from './schemas';
import { STATE_TEXT } from './words';
import styles from './Summary.module.css';

/** The Summary report (feature 048): revenue against goal, the funnel and four league tables, in 039's frame. */
export function SummaryReport() {
  return (
    <ReportFrame report="summary" period>
      {(_frame, address) => <SummaryBody address={address} />}
    </ReportFrame>
  );
}

function SummaryBody({ address }: { address: ReportAddress }) {
  const [search, setSearch] = useSearchParams();
  const params = readSummaryParams(search);
  const change = (changes: Partial<SummaryParams>) =>
    setSearch(writeSummaryParams(search, { ...params, ...changes }));
  const report = useSummaryReport(address, {
    ...(params.category && { category: params.category }),
    ...(params.stage && { stage: params.stage }),
  });
  const details = (path: string) => `/reports/${path}?${search.toString()}`;
  return (
    <div className={styles.body}>
      <div className={styles.controls}>
        <CategorySelect value={params.category} onChange={(category) => change({ category })} />
        <Link className={styles.link} to={details('revenue')}>
          Revenue details
        </Link>
        <Link className={styles.link} to={details('funnel')}>
          Funnel details
        </Link>
      </div>
      {report.data ? (
        <>
          {report.data.states.map((state) => (
            <p key={state} className={styles.state} role="status">
              {STATE_TEXT[state] ?? state}{' '}
              {state === 'nothingMatches' && (
                <Link className={styles.link} to="/reports/summary">
                  Reset the filters
                </Link>
              )}
            </p>
          ))}
          <RevenueSection revenue={report.data.revenue} />
          <FunnelSection funnel={report.data.funnel} />
        </>
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <div aria-label="Loading the figures">
          <Skeleton lines={4} height="24px" />
        </div>
      )}
      <section className={styles.leagues} aria-label="League tables">
        {TABLES.map(({ table, param }) => (
          <LeagueTable
            key={table}
            table={table}
            address={address}
            category={params.category}
            segment={params[param]}
            onSegment={(segment) => change({ [param]: segment })}
            covers={report.data?.financeCovers}
          />
        ))}
      </section>
    </div>
  );
}
