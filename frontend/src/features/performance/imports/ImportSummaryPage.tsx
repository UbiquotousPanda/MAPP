import { Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useFormatters } from '@/format/useFormatters';
import { forbiddenMessage } from '@/session/access';
import { Button, LinkButton } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { useCanChange } from '@/ui/useCanChange';
import { usePageTitle } from '@/ui/usePageTitle';
import { PERFORMANCE_DATA } from '../performance-text';
import { usePerformanceSources } from '../api';
import { useImport } from './api';
import type { PerformanceImport } from './api';
import { ImportCounts } from './ImportCounts';
import {
  IMPORTS,
  IMPORTS_PATH,
  NOT_EDITABLE,
  ORIGIN_WORDS,
  STATUS_TONES,
  STATUS_WORDS,
  UNDO_NEEDS_ADMIN,
} from './imports-text';
import { UndoDialog } from './UndoDialog';
import styles from './imports.module.css';

/** One load's summary: the five outcomes adding up to rows read, per measure below, and Undo. */
export function ImportSummaryPage() {
  const { importId = '' } = useParams();
  const load = useImport(importId);
  usePageTitle(load.data?.fileName ?? IMPORTS);
  const refused = forbiddenMessage(load.error);
  if (refused) {
    return <NoAccess message={refused} />;
  }
  if (load.isError) {
    return <ErrorState error={load.error} onRetry={() => void load.refetch()} />;
  }
  if (!load.data) {
    return <Skeleton lines={6} />;
  }
  return <Summary load={load.data} />;
}

function Summary({ load }: { load: PerformanceImport }) {
  const { dateTime } = useFormatters();
  const sources = usePerformanceSources();
  const managesSettings = useCanChange('settings.manage');
  const imports = useCanChange('performance.import');
  const mayUndo = managesSettings && imports;
  const [asking, setAsking] = useState(false);
  const sourceName = sources.data?.items.find((s) => s.id === load.sourceId)?.name ?? load.sourceId;
  const undoable = load.status === 'completed';
  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Settings', to: '/settings' },
          { label: PERFORMANCE_DATA, to: '/settings/performance-data' },
          { label: IMPORTS, to: IMPORTS_PATH },
          { label: load.fileName },
        ]}
        title={load.fileName}
        meta={
          <>
            <StatusChip tone={STATUS_TONES[load.status]}>{STATUS_WORDS[load.status]}</StatusChip>
            <span>{sourceName}</span>
            <span>{ORIGIN_WORDS[load.origin]}</span>
            <span>{`Loaded by ${load.createdBy.name} on ${dateTime(load.createdAt)}`}</span>
          </>
        }
        actions={
          undoable &&
          mayUndo && (
            <Button icon={<Undo2 aria-hidden />} onClick={() => setAsking(true)}>
              Undo import
            </Button>
          )
        }
      />
      <div className={styles.stack}>
        <Card title="Summary">
          <ImportCounts load={load} />
        </Card>
        <p className={styles.note}>{NOT_EDITABLE}</p>
        {load.status === 'undone' && (
          <p className={styles.note}>
            {`Undone by ${load.updatedBy.name} on ${dateTime(load.updatedAt)}. Its figures no longer count anywhere.`}
          </p>
        )}
        {undoable && !mayUndo && <p className={styles.note}>{UNDO_NEEDS_ADMIN}</p>}
        <div>
          <LinkButton to={`/settings/performance-data/review?importId=${load.id}`}>
            Rows to review from this import
          </LinkButton>
        </div>
      </div>
      {asking && <UndoDialog load={load} onClose={() => setAsking(false)} />}
    </>
  );
}
