import { useId } from 'react';
import { Link } from 'react-router';
import { ApiError } from '@/api/errors';
import type { components } from '@/api/generated/schema';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { usePageTitle } from '@/ui/usePageTitle';
import { REPORT_GROUPS, REPORT_ICONS } from './report-groups';
import { useReportCatalogue } from './shared/api';
import styles from './ReportsPage.module.css';

type CatalogueEntry = components['schemas']['ReportCatalogue']['items'][number];

/** The reports the person may open as cards in their groups, each with its one-line purpose. */
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
        description="Read-only reports on your plans and budgets, approvals, purchasing and GSAP, and performance against goal."
      />
      {catalogue.data ? (
        <ReportGroups items={catalogue.data.items} />
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

function ReportGroups({ items }: { items: CatalogueEntry[] }) {
  const groups = REPORT_GROUPS.map((group) => ({
    title: group.title,
    items: group.reports.flatMap((key) => items.filter((item) => item.key === key)),
  })).filter((group) => group.items.length > 0);
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <ReportGroupSection key={group.title} title={group.title} items={group.items} />
      ))}
    </div>
  );
}

function ReportGroupSection({ title, items }: { title: string; items: CatalogueEntry[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={styles.group}>
      <h2 id={headingId} className={styles.groupTitle}>
        {title}
      </h2>
      <ul className={styles.cards}>
        {items.map((report) => (
          <li key={report.key}>
            <ReportCard report={report} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportCard({ report }: { report: CatalogueEntry }) {
  const id = useId();
  const Icon = REPORT_ICONS[report.key];
  const body = (
    <>
      <Icon aria-hidden="true" className={styles.icon} />
      <span id={`${id}-name`} className={styles.name}>
        {report.name}
      </span>
      <span id={`${id}-purpose`} className={styles.purpose}>
        {report.purpose}
      </span>
    </>
  );
  if (!report.available) {
    return (
      <div className={styles.card}>
        {body}
        <StatusChip tone="neutral">Coming soon</StatusChip>
      </div>
    );
  }
  return (
    <Link
      to={`/reports/${report.path}`}
      aria-labelledby={`${id}-name`}
      aria-describedby={`${id}-purpose`}
      className={`${styles.card} ${styles.cardLink}`}
    >
      {body}
    </Link>
  );
}
