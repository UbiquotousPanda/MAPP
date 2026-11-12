import { Funnel, Info, TrendingUp } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { LinkButton } from '@/ui/Button/Button';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { ReportFrame } from '../shared';
import type { ReportAddress } from '../shared';
import { CategoryControl } from '../revenue/CategorySelect';
import { useSummaryReport } from './api';
import { FunnelSection } from './FunnelSection';
import { LeagueSection } from './LeagueTable';
import { RevenueSection } from './RevenueSection';
import { TABLES, readSummaryParams, writeSummaryParams } from './schemas';
import type { SummaryParams } from './schemas';
import { STATE_TEXT } from './words';
import styles from './Summary.module.css';

/** The Summary report (feature 048): revenue against goal, the funnel and four league tables, in 039's frame. */
export function SummaryReport() {
  return (
    <ReportFrame report="summary" controls={() => <CategoryControl />}>
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
      {report.data ? (
        <>
          <RevenueSection
            revenue={report.data.revenue}
            details={
              <LinkButton size="sm" icon={<TrendingUp />} to={details('revenue')}>
                Revenue details
              </LinkButton>
            }
            notes={report.data.states.map((state) => (
              <p key={state} className={styles.state} role="status">
                <Info aria-hidden="true" />
                <span>
                  {STATE_TEXT[state] ?? state}{' '}
                  {state === 'nothingMatches' && (
                    <Link className={styles.link} to="/reports/summary">
                      Reset the filters
                    </Link>
                  )}
                </span>
              </p>
            ))}
          />
          <FunnelSection
            funnel={report.data.funnel}
            details={
              <LinkButton size="sm" icon={<Funnel />} to={details('funnel')}>
                Funnel details
              </LinkButton>
            }
          />
        </>
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <div aria-label="Loading the figures">
          <Skeleton lines={4} height="24px" />
        </div>
      )}
      <LeagueSection
        address={address}
        params={params}
        onSegment={(segment) =>
          change(Object.fromEntries(TABLES.map(({ param }) => [param, segment])))
        }
        covers={report.data?.financeCovers}
      />
    </div>
  );
}
