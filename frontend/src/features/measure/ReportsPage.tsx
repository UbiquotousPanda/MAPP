import { ChartColumnIncreasing } from 'lucide-react';
import { Link } from 'react-router';
import type { components } from '@/api/generated/schema';
import { ApiError } from '@/api/errors';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { usePageTitle } from '@/ui/usePageTitle';
import { REPORT_ABOUT, REPORT_GROUPS } from './reports';
import type { ReportGroup } from './reports';
import { useReportCatalogue } from './shared/api';
import styles from './ReportsPage.module.css';

type CatalogueEntry = components['schemas']['ReportCatalogue']['items'][number];

/** The reports the person may open, by group, each with its one-line purpose and an ⓘ saying who it is for. */
export function ReportsPage() {
  usePageTitle('Reports');
  const catalogue = useReportCatalogue();
  if (catalogue.error instanceof ApiError && catalogue.error.kind === 'forbidden') {
    return <NoAccess />;
  }
  return (
    <>
      <PageHeader
        title="Reports"
        description="Read-only reports of your plans, approvals, purchase requests and their figures."
      />
      {catalogue.data ? (
        REPORT_GROUPS.map((group) => (
          <GroupSection key={group.title} group={group} items={catalogue.data.items} />
        ))
      ) : catalogue.isError ? (
        <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} />
      ) : (
        <div aria-label="Loading the reports">
          <Skeleton lines={6} height="48px" />
        </div>
      )}
    </>
  );
}

function GroupSection({ group, items }: { group: ReportGroup; items: CatalogueEntry[] }) {
  const reports = items.filter((item) => group.reports.includes(item.key));
  if (reports.length === 0) {
    return null;
  }
  const headingId = `reports-${group.reports[0]}`;
  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.groupTitle}>
        {group.title}
      </h2>
      <p className={styles.groupDescription}>{group.description}</p>
      <ul className={styles.list}>
        {reports.map((report) => (
          <ReportItem key={report.key} report={report} />
        ))}
      </ul>
    </section>
  );
}

function ReportItem({ report }: { report: CatalogueEntry }) {
  return (
    <li className={styles.report}>
      <ChartColumnIncreasing aria-hidden="true" className={styles.icon} />
      <div className={styles.text}>
        <div className={styles.title}>
          {report.available ? (
            <Link to={`/reports/${report.path}`} className={styles.name}>
              {report.name}
            </Link>
          ) : (
            <span className={styles.name}>{report.name}</span>
          )}
          <InfoTip label={report.name} text={REPORT_ABOUT[report.key]} />
        </div>
        <p className={styles.purpose}>{report.purpose}</p>
      </div>
      {!report.available && <StatusChip tone="neutral">Coming soon</StatusChip>}
    </li>
  );
}
