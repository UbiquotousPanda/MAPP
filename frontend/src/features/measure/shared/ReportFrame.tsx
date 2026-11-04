import { ChartColumnIncreasing } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { ApiError } from '@/api/errors';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '@/ui/Button/Button';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { FilterChips } from '@/ui/FilterChips/FilterChips';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { usePageTitle } from '@/ui/usePageTitle';
import { REPORT_ROUTES } from '../reports';
import type { ReportKey } from '../reports';
import { useReportFrame } from './api';
import type { ReportFrame as Frame } from './api';
import { downloadReport } from './api';
import { ExportMenu } from './ExportMenu';
import { FilterPanel } from './FilterPanel';
import { PlainReportFrame } from './PlainReportFrame';
import { isRestricted, resetFilters } from './report-address';
import type { ReportAddress, Show } from './report-address';
import { chipsOf, coverageText, inViewText, leftOutText, withoutChip } from './report-text';
import { CurrencyControl, InViewLine, PeriodControl, ShowControl } from './ReportControls';
import { SavedViewsMenu } from './SavedViewsMenu';
import { useReportAddress } from './useReportAddress';
import styles from './ReportFrame.module.css';

export interface ReportFrameProps {
  report: ReportKey;
  /** The controls the report uses; Currency is always offered. */
  period?: boolean;
  show?: Show;
  /** The report's widgets for the frame; absent for a report not built yet. */
  children?: (frame: Frame, address: ReportAddress) => ReactNode;
  comingSoon?: string;
  /** False for a report the plan filters do not apply to (User access, 045-C1): header, saved views and export only. */
  filters?: boolean;
}

/**
 * The address as the frame applied it: the resolved year and currency, left-out values dropped.
 * While an older frame stands in for the one loading, the address itself is what was applied.
 */
function appliedAddress(address: ReportAddress, frame: Frame, loading: boolean): ReportAddress {
  const f = frame.filter;
  if (loading) {
    return { ...address, year: address.year ?? f.year };
  }
  return {
    ...address,
    year: f.year,
    plans: f.plans,
    teams: f.teams,
    owners: f.owners,
    activityTypes: f.activityTypes,
  };
}

export function ReportFrame(props: ReportFrameProps) {
  return props.filters === false ? (
    <PlainReportFrame {...props} />
  ) : (
    <FilteredReportFrame {...props} />
  );
}

/** What every report page shares (contracts/ui.md). */
function FilteredReportFrame({ report, period, show, children, comingSoon }: ReportFrameProps) {
  const name = REPORT_ROUTES.find((r) => r.key === report)?.name ?? 'Report';
  usePageTitle(name);
  const [address, setAddress] = useReportAddress();
  const [params] = useSearchParams();
  const frame = useReportFrame(report, address);
  const { dateTime } = useFormatters();

  if (frame.error instanceof ApiError && frame.error.kind === 'forbidden') {
    return <NoAccess />;
  }
  const data = frame.data;
  const applied = data && appliedAddress(address, data, frame.isPlaceholderData);
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Reports', to: '/reports' }, { label: name }]}
        title={name}
        meta={data && `${data.filter.year} · Figures as of ${dateTime(data.generatedAt)}`}
        actions={
          data && (
            <>
              <SavedViewsMenu report={report} />
              <ExportMenu
                label="Export"
                formats={['xlsx']}
                download={(format) => downloadReport(report, address, format, { own: params })}
              />
            </>
          )
        }
      />
      {data && applied ? (
        <div className={styles.layout} aria-busy={frame.isFetching || undefined}>
          <FilterPanel
            choices={data.choices}
            applied={applied}
            year={applied.year ?? data.filter.year}
            busy={frame.isFetching}
            onApply={setAddress}
          />
          <section className={styles.content} aria-label={name}>
            <InViewLine text={inViewText(data.inView)} />
            <div className={styles.chipsRow}>
              <FilterChips
                chips={chipsOf(applied, data.choices)}
                onRemove={(key) => setAddress(withoutChip(address, key))}
              />
              {isRestricted(address) && (
                <Button
                  type="button"
                  size="sm"
                  variant="tertiary"
                  onClick={() => setAddress(resetFilters(address))}
                >
                  Reset filters
                </Button>
              )}
            </div>
            {data.leftOut > 0 && (
              <p className={styles.note} role="status">
                {leftOutText(data.leftOut)}
              </p>
            )}
            {coverageText(data.finance.plans, data.finance.of) && (
              <p className={styles.note}>{coverageText(data.finance.plans, data.finance.of)}</p>
            )}
            <div className={styles.controls}>
              {period && (
                <PeriodControl
                  value={address.period}
                  onChange={(p) => setAddress({ ...address, period: p })}
                />
              )}
              {show && (
                <ShowControl
                  value={address.show ?? show}
                  onChange={(s) => setAddress({ ...address, show: s })}
                />
              )}
              <CurrencyControl
                currencies={data.choices.currencies}
                value={data.filter.currency}
                onChange={(c) => setAddress({ ...address, currency: c })}
              />
            </div>
            <FrameBody
              data={data}
              address={address}
              onReset={() => setAddress(resetFilters(address))}
              comingSoon={comingSoon}
            >
              {children}
            </FrameBody>
          </section>
        </div>
      ) : frame.isError ? (
        <ErrorState error={frame.error} onRetry={() => void frame.refetch()} />
      ) : (
        <div aria-label="Loading the report">
          <Skeleton lines={8} height="24px" />
        </div>
      )}
    </>
  );
}

interface FrameBodyProps {
  data: Frame;
  address: ReportAddress;
  onReset: () => void;
  comingSoon?: string;
  children: ReportFrameProps['children'];
}

/** The widgets, or why there are none. */
function FrameBody({ data, address, onReset, comingSoon, children }: FrameBodyProps) {
  if (data.choices.plans.length > 0 && data.inView.plans === 0 && isRestricted(address)) {
    return (
      <EmptyState
        icon={<ChartColumnIncreasing />}
        title="Your filters exclude everything"
        text="No record matches every filter."
        action={
          <Button type="button" variant="secondary" onClick={onReset}>
            Reset filters
          </Button>
        }
      />
    );
  }
  if (data.inView.plans === 0) {
    const others = data.choices.years.filter((y) => y !== data.filter.year);
    return (
      <EmptyState
        icon={<ChartColumnIncreasing />}
        title={`No plans you may see for ${data.filter.year}`}
        text={others.length > 0 ? `There are plans for ${others.join(', ')}.` : undefined}
      />
    );
  }
  if (!children) {
    return <EmptyState icon={<ChartColumnIncreasing />} title="Coming soon" text={comingSoon} />;
  }
  return <div className={styles.widgets}>{children(data, address)}</div>;
}
