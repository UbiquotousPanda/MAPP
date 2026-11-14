import type { components } from '@/api/generated/schema';
import { ApiError } from '@/api/errors';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { Tile, TileList } from '@/ui/Tile/Tile';
import type { TileAccent } from '@/ui/Tile/Tile';
import { usePageTitle } from '@/ui/usePageTitle';
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
        <TileList>
          {catalogue.data.items.map((report) => (
            <ReportItem key={report.key} report={report} />
          ))}
        </TileList>
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
const ACCENTS: Partial<Record<ReportKey, TileAccent>> = {
  performance: 4,
  budget: 1,
  purchasing: 1,
  approvals: 3,
  planData: 3,
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
    <Tile
      title={name}
      to={report.available ? `/reports/${report.path}` : undefined}
      accent={ACCENTS[report.key] ?? 4}
      picture={<ReportPreview report={report.key} />}
      aside={<InfoTip label={name} text={about} />}
      foot={audience && `For ${audience}`}
      status={<StatusChip tone="neutral">Coming soon</StatusChip>}
    >
      {question && <p className={styles.question}>{question}</p>}
    </Tile>
  );
}
