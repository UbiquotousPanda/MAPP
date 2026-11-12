import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import type { ReportKey } from '../reports';
import { downloadReport } from './api';
import { ExportMenu } from './ExportMenu';
import { Paging, RankedControls } from './RankedControls';
import { LevelSwitch } from './ReportControls';
import type { Show } from './report-address';
import type { Choice } from './RankedControls';
import { useRankedState } from './ranked-params';
import { RankedTable } from './RankedTable';
import { useReportAddress } from './useReportAddress';
import styles from './RankedList.module.css';

export interface RankedEntryData<F> {
  id: string;
  level: string;
  name: string;
  planId: string;
  owner?: { name: string };
  figures: F;
  children?: RankedEntryData<F>[];
}

export interface RankedData<F> {
  total: number;
  trail: { id: string; level: string; name: string }[];
  groups: { key: string; label: string; totals: F; entries: RankedEntryData<F>[] }[];
  drillLost: boolean;
}

export interface RankedColumn<F> {
  key: string;
  label: string;
  value: (figures: F) => string;
  sortable?: boolean;
  /** Draws an entry's cell instead of its text, such as a figure that opens a panel; group totals keep the text. */
  render?: (figures: F, entry: RankedEntryData<F>) => ReactNode;
  /** Why an entry's figure is empty, from the API's reason: its cell shows "—" with this as a tip. */
  empty?: (figures: F) => string | undefined;
}

export interface RankedListProps<F> {
  report: ReportKey;
  data: RankedData<F> | undefined;
  /** The list's load failure, shown with Try again; null while it is fine. */
  error: unknown;
  onRetry: () => void;
  columns: RankedColumn<F>[];
  groups: Choice[];
  defaultSort: string;
  defaultOrder?: 'desc' | 'asc';
  /** A word on an entry the reader must notice, such as "Over-allocated". */
  flag?: (figures: F) => string | undefined;
  /** Shows each entry's owner after its name. */
  owner?: boolean;
  /** Offers Plan · Campaign · Initiative · Activity in the header, starting at this level. */
  levelFallback?: Show;
  /** One muted line above the table, such as what its figures rest on. */
  caption?: string;
}

/** The ranked list: top entries with their children, drill with a trail, shared with 049. */
export function RankedList<F>(props: RankedListProps<F>) {
  const { report, data, error, onRetry, columns, groups, defaultSort, flag, owner = false } = props;
  const { levelFallback, caption, defaultOrder } = props;
  const { state, change } = useRankedState(defaultSort, defaultOrder);
  const [address] = useReportAddress();
  const [params] = useSearchParams();
  const box = useRef<HTMLDivElement>(null);
  const focusAfterDrill = useRef(false);
  const drill = (id: string) => {
    focusAfterDrill.current = true;
    change({ drill: id });
  };
  const at = data?.trail.at(-1)?.id ?? '';
  useEffect(() => {
    if (!focusAfterDrill.current) return;
    focusAfterDrill.current = false;
    box.current
      ?.querySelector<HTMLElement>('[aria-current="location"], [data-focus-fallback]')
      ?.focus();
  }, [at]);
  const sortBy = (key: string) =>
    change(
      key === state.sort
        ? { order: state.order === 'desc' ? 'asc' : 'desc' }
        : { sort: key, order: 'desc' },
    );
  const notes = data ? emptyColumns(data, columns) : [];
  return (
    <Card
      title="Ranked list"
      actions={
        <div className={styles.headerActions}>
          {levelFallback && <LevelSwitch fallback={levelFallback} />}
          <ExportMenu
            label="Export ranked list"
            iconOnly
            formats={['xlsx', 'csv']}
            download={(format) =>
              downloadReport(report, address, format, { widget: 'ranked', own: params })
            }
          />
        </div>
      }
    >
      <div ref={box}>
        <RankedControls state={state} groups={groups} onChange={change} />
        {data && data.trail.length > 0 && <Trail trail={data.trail} onDrill={drill} />}
        {data?.drillLost && (
          <p className={styles.note}>
            The record you opened is no longer in view, so the list starts at the top.
          </p>
        )}
        {(caption || notes.length > 0) && (
          <p className={styles.note}>{[caption, ...notes].filter(Boolean).join(' · ')}</p>
        )}
        {error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : data ? (
          <RankedTable
            data={data}
            columns={columns}
            sort={state}
            onSort={sortBy}
            flag={flag}
            owner={owner}
            onDrill={drill}
          />
        ) : (
          <Skeleton lines={5} height="24px" />
        )}
        {data && <Paging state={state} total={data.total} onChange={change} />}
      </div>
    </Card>
  );
}

function Trail({
  trail,
  onDrill,
}: {
  trail: RankedData<unknown>['trail'];
  onDrill: (id: string) => void;
}) {
  const back = trail.length > 1 ? (trail.at(-2)?.id ?? '') : '';
  return (
    <nav className={styles.trail} aria-label="Drill trail">
      <Button size="sm" icon={<ChevronLeft />} onClick={() => onDrill(back)}>
        Back
      </Button>
      {trail.map((step, i) =>
        i < trail.length - 1 ? (
          <Button key={step.id} size="sm" variant="tertiary" onClick={() => onDrill(step.id)}>
            {step.name}
          </Button>
        ) : (
          <span key={step.id} className={styles.current} aria-current="location" tabIndex={-1}>
            {step.name}
          </span>
        ),
      )}
    </nav>
  );
}

/** A column with no figure for any entry says its reason once, above the table, instead of only per row. */
function emptyColumns<F>(data: RankedData<F>, columns: RankedColumn<F>[]): string[] {
  const entries = data.groups.flatMap((g) => g.entries.flatMap((e) => [e, ...(e.children ?? [])]));
  return columns.flatMap((c) => {
    const reasons = entries.map((e) => c.empty?.(e.figures));
    const first = reasons[0];
    const same = first && first !== '—' && reasons.every((r) => r === first);
    return same ? [`${c.label}: ${first}`] : [];
  });
}
