import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { components } from '@/api/generated/schema';
import { ApiError } from '@/api/errors';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { cx } from '@/ui/cx';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { usePageTitle } from '@/ui/usePageTitle';
import { ReportPreview } from './ReportPreview';
import { REPORT_ABOUT, REPORT_GROUPS, REPORT_ROUTES } from './reports';
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
        description="Your plans, approvals, purchase requests and their figures."
      />
      {catalogue.data ? (
        REPORT_GROUPS.map((group, index) => (
          <GroupSection
            key={group.title}
            group={group}
            items={catalogue.data.items}
            index={index}
          />
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

const GROUP_TONES = ['performance', 'spend', 'governance'] as const;

function GroupSection({ group, items, index }: GroupProps) {
  const reports = items.filter((item) => group.reports.includes(item.key));
  if (reports.length === 0) {
    return null;
  }
  const headingId = `reports-${group.reports[0]}`;
  const tone = GROUP_TONES[index % GROUP_TONES.length] ?? 'performance';
  return (
    <section className={cx(styles.group, styles[tone])} aria-labelledby={headingId}>
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

interface GroupProps {
  group: ReportGroup;
  items: CatalogueEntry[];
  index: number;
}

/** "Is the year on track?" and "For marketing leaders.": the ⓘ text's question and audience. */
function aboutParts(about: string): { question: string; audience: string } {
  const question = about.slice(0, about.indexOf('?') + 1);
  const audience = /\bFor ([^.]+)\./.exec(about)?.[1] ?? '';
  return { question, audience };
}

function ReportItem({ report }: { report: CatalogueEntry }) {
  const { question, audience } = aboutParts(REPORT_ABOUT[report.key]);
  const name = REPORT_ROUTES.find((route) => route.key === report.key)?.name ?? report.name;
  return (
    <li className={report.available ? styles.tile : styles.tileOff}>
      <div className={styles.preview}>
        <ReportPreview report={report.key} />
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.nameHeading}>
            {report.available ? (
              <Link to={`/reports/${report.path}`} className={styles.name}>
                {name}
              </Link>
            ) : (
              <span className={styles.name}>{name}</span>
            )}
          </h3>
          <InfoTip label={name} text={REPORT_ABOUT[report.key]} />
        </div>
        {question && <p className={styles.question}>{question}</p>}
        <div className={styles.foot}>
          {audience && <span className={styles.audience}>For {audience}</span>}
          {report.available ? (
            <span className={styles.go} aria-hidden="true">
              <ArrowRight />
            </span>
          ) : (
            <StatusChip tone="neutral">Coming soon</StatusChip>
          )}
        </div>
      </div>
    </li>
  );
}
