import { FileUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { forbiddenMessage } from '@/session/access';
import { Button } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { useToast } from '@/ui/Toast/useToast';
import { usePageTitle } from '@/ui/usePageTitle';
import tableStyles from '@/ui/settings-table.module.css';
import { usePerformanceSources } from '../api';
import type { PerformanceSource } from '../api';
import { FilterBar } from '../filters/FilterBar';
import { useUrlFilters } from '../filters/useUrlFilters';
import type { UrlFilters } from '../filters/useUrlFilters';
import { PERFORMANCE_DATA } from '../performance-text';
import { useImports } from './api';
import type { ImportFilters, ImportStatus, PerformanceImport } from './api';
import {
  EMPTY_TEXT,
  EMPTY_TITLE,
  IMPORTS,
  IMPORTS_DESCRIPTION,
  importPath,
  NO_MATCH,
  ORIGIN_WORDS,
  STATUS_TONES,
  STATUS_WORDS,
} from './imports-text';
import { PullDialog } from './PullDialog';
import { UploadDialog } from './UploadDialog';

const FILTER_NAMES = ['search', 'status', 'sourceId', 'since', 'until'] as const;
const STATUSES: ImportStatus[] = ['completed', 'failed', 'undone'];

function importFiltersOf(values: UrlFilters['values']): ImportFilters {
  const status = STATUSES.find((s) => s === values.status);
  return {
    search: values.search || undefined,
    status,
    sourceId: values.sourceId || undefined,
    since: values.since || undefined,
    until: values.until || undefined,
  };
}

/** Settings › Performance data › Imports: every load, findable, with Upload and Pull. */
export function ImportsPage() {
  usePageTitle(IMPORTS);
  const navigate = useNavigate();
  const { show } = useToast();
  const filters = useUrlFilters(FILTER_NAMES);
  const imports = useImports(importFiltersOf(filters.values));
  const sources = usePerformanceSources();
  const [dialog, setDialog] = useState<'upload' | 'pull' | null>(null);
  const refused = forbiddenMessage(imports.error);
  if (refused) {
    return <NoAccess message={refused} />;
  }
  const sourceList = sources.data?.items ?? [];

  function opened(load: PerformanceImport) {
    setDialog(null);
    show({ message: `'${load.fileName}' loaded` });
    void navigate(importPath(load.id));
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Settings', to: '/settings' },
          { label: PERFORMANCE_DATA, to: '/settings/performance-data' },
          { label: IMPORTS },
        ]}
        title={IMPORTS}
        description={IMPORTS_DESCRIPTION}
        actions={
          <>
            <Button icon={<RefreshCw aria-hidden />} onClick={() => setDialog('pull')}>
              Pull simulated feed
            </Button>
            <Button
              variant="primary"
              icon={<FileUp aria-hidden />}
              onClick={() => setDialog('upload')}
            >
              Upload a file
            </Button>
          </>
        }
      />
      <Card>
        {imports.isError ? (
          <ErrorState error={imports.error} onRetry={() => void imports.refetch()} />
        ) : imports.data ? (
          <>
            <FilterBar
              search={{
                name: 'search',
                label: 'Search imports',
                placeholder: 'Search file or uploader',
              }}
              selects={[
                {
                  name: 'status',
                  label: 'Status',
                  options: [
                    { value: '', label: 'Any status' },
                    ...STATUSES.map((s) => ({ value: s, label: STATUS_WORDS[s] })),
                  ],
                },
                {
                  name: 'sourceId',
                  label: 'Data source',
                  options: [
                    { value: '', label: 'Every data source' },
                    ...sourceList.map((s) => ({ value: s.id, label: s.name })),
                  ],
                },
              ]}
              filters={filters}
              count={importCount(imports.data.items.length)}
            />
            <ImportTable items={imports.data.items} sources={sourceList} filters={filters} />
          </>
        ) : (
          <Skeleton lines={4} />
        )}
      </Card>
      {dialog === 'upload' && (
        <UploadDialog sources={sourceList} onClose={() => setDialog(null)} onLoaded={opened} />
      )}
      {dialog === 'pull' && (
        <PullDialog sources={sourceList} onClose={() => setDialog(null)} onLoaded={opened} />
      )}
    </>
  );
}

function importCount(count: number): string {
  return `${formatWhole(count)} ${count === 1 ? 'import' : 'imports'}`;
}

interface ImportTableProps {
  items: PerformanceImport[];
  sources: PerformanceSource[];
  filters: UrlFilters;
}

function ImportTable({ items, sources, filters }: ImportTableProps) {
  const { dateTime } = useFormatters();
  if (items.length === 0) {
    return filters.inUse ? (
      <div className={tableStyles.noMatch}>
        <p>{NO_MATCH}</p>
        <Button onClick={filters.clear}>Clear filters</Button>
      </div>
    ) : (
      <EmptyState icon={<FileUp aria-hidden />} title={EMPTY_TITLE} text={EMPTY_TEXT} />
    );
  }
  const nameOf = (id: string) => sources.find((s) => s.id === id)?.name ?? id;
  return (
    <div className={tableStyles.tableScroll}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">Data source</th>
            <th scope="col">Arrived by</th>
            <th scope="col">Loaded by</th>
            <th scope="col">Loaded on</th>
            <th scope="col" className={tableStyles.number}>
              Rows read
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((load) => (
            <tr key={load.id}>
              <td className={tableStyles.nameCell}>
                <Link to={importPath(load.id)}>{load.fileName}</Link>
              </td>
              <td>{nameOf(load.sourceId)}</td>
              <td>{ORIGIN_WORDS[load.origin]}</td>
              <td>{load.createdBy.name}</td>
              <td className={tableStyles.nowrap}>{dateTime(load.createdAt)}</td>
              <td className={tableStyles.number}>{formatWhole(load.counts.read)}</td>
              <td>
                <StatusChip tone={STATUS_TONES[load.status]}>
                  {STATUS_WORDS[load.status]}
                </StatusChip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
