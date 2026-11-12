import { ChartColumnIncreasing } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { ApiError } from '@/api/errors';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '@/ui/Button/Button';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
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
import { PlainReportFrame } from './PlainReportFrame';
import { isRestricted, resetFilters } from './report-address';
import type { ReportAddress } from './report-address';
import { coverageText, inViewText, leftOutText } from './report-text';
import { ReportToolbar } from './ReportToolbar';
import { CopyLinkButton, SavedViewsMenu } from './SavedViewsMenu';
import { useReportAddress } from './useReportAddress';
import styles from './ReportFrame.module.css';

export interface ReportFrameProps {
  report: ReportKey;
  /** The report's own controls (a category, a stage), placed in the toolbar beside Year. */
  controls?: (address: ReportAddress) => ReactNode;
  /** The report's widgets for the frame; absent for a report not built yet. */
  children?: (frame: Frame, address: ReportAddress) => ReactNode;
  comingSoon?: string;
  /** False for a report the plan filters do not apply to (User access, 045-C1): header, saved views and export only. */
  filters?: boolean;
}

export function ReportFrame(props: ReportFrameProps) {
  return props.filters === false ? (
    <PlainReportFrame {...props} />
  ) : (
    <FilteredReportFrame {...props} />
  );
}

/** What every report page shares (contracts/ui.md). */
function FilteredReportFrame({ report, controls, children, comingSoon }: ReportFrameProps) {
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
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Reports', to: '/reports' }, { label: name }]}
        title={name}
        meta={
          data && (
            <span>
              {data.filter.year} · Figures as of {dateTime(data.generatedAt)} ·{' '}
              <span>{inViewText(data.inView)}</span>
            </span>
          )
        }
        actions={
          data && (
            <>
              <SavedViewsMenu report={report} />
              <CopyLinkButton />
              <ExportMenu
                label="Export"
                size="sm"
                formats={['xlsx']}
                download={(format) => downloadReport(report, address, format, { own: params })}
              />
            </>
          )
        }
      />
      {data ? (
        <div className={styles.layout} aria-busy={frame.isFetching || undefined}>
          <ReportToolbar
            data={data}
            address={address}
            onChange={setAddress}
            controls={controls?.(address)}
          />
          <div className={styles.notes}>
            {data.leftOut > 0 && <p role="status">{leftOutText(data.leftOut)}</p>}
            {coverageText(data.finance.plans, data.finance.of) && (
              <p>{coverageText(data.finance.plans, data.finance.of)}</p>
            )}
          </div>
          <section className={styles.content} aria-label={name}>
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
