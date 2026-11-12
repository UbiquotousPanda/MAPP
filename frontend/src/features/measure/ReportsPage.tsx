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
import linkCard from '@/ui/LinkCard/LinkCard.module.css';
import { ReportPreview } from './ReportPreview';
import { REPORT_ABOUT, REPORT_ROUTES } from './reports';
import type { ReportKey } from './reports';
import { useReportCatalogue } from './shared/api';
import styles from './ReportsPage.module.css';

type CatalogueEntry = components['schemas']['ReportCatalogue']['items'][number];

/** The reports the person may open as equal tiles, each with its question and an ⓘ saying who it is for. */
export function ReportsPage() {
  usePageTitle('Reports');
  const catalogue = useReportCatalogue();
  if (catalogue.error instanceof ApiError && catalogue.error.kind === 'forbidden') {
    return <NoAccess />;
  }
  return (
    <>
      <PageHeader title="Reports" />
      {catalogue.data ? (
        <ul className={styles.list}>
          {catalogue.data.items.map((report) => (
            <ReportItem key={report.key} report={report} />
          ))}
        </ul>
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

// Each report keeps its old group's chart colour, carried by its drawing.
const TONES: Partial<Record<ReportKey, 'performance' | 'spend' | 'governance'>> = {
  performance: 'performance',
  budget: 'spend',
  purchasing: 'spend',
  approvals: 'governance',
  planData: 'governance',
};

/** "Is the year on track?" and "For marketing leaders.": the ⓘ text's question and audience. */
function aboutParts(about: string): { question: string; audience: string } {
  const question = about.slice(0, about.indexOf('?') + 1);
  const audience = /\bFor ([^.]+)\./.exec(about)?.[1] ?? '';
  return { question, audience };
}

function ReportItem({ report }: { report: CatalogueEntry }) {
  const about = REPORT_ABOUT[report.key] ?? report.purpose;
  const { question, audience } = aboutParts(about);
  const name = REPORT_ROUTES.find((route) => route.key === report.key)?.name ?? report.name;
  return (
    <li
      className={cx(
        linkCard.card,
        report.available ? styles.tile : styles.tileOff,
        styles[TONES[report.key] ?? 'performance'],
      )}
    >
      <div className={styles.preview}>
        <ReportPreview report={report.key} />
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h2 className={styles.nameHeading}>
            {report.available ? (
              <Link to={`/reports/${report.path}`} className={cx(styles.name, linkCard.link)}>
                {name}
              </Link>
            ) : (
              <span className={styles.name}>{name}</span>
            )}
          </h2>
          <InfoTip label={name} text={about} />
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
