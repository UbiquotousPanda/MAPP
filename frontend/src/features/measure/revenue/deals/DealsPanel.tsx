import { RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/errors';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '@/ui/Button/Button';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { Pager } from '@/ui/Pager/Pager';
import { SidePanel } from '@/ui/SidePanel/SidePanel';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { ExportMenu, downloadReport } from '../../shared';
import type { Money, ReportAddress } from '../../shared';
import { COMPARE_PARAM, useDealsAddress } from './address';
import type { DealsAddress } from './address';
import { dealsParams, useActivityDeals } from './api';
import type { ActivityDeals, AttributionModel } from './api';
import { CompareSelect } from './CompareSelect';
import { DealCard } from './DealCard';
import styles from './Deals.module.css';

export const SCOPE_SENTENCE =
  'Worked out from the plans you can open; someone who can open other plans may see different shares.';

/** What the ranked list showed when the panel was opened, so a figure that moved meanwhile is noticed. */
export interface OpenedWith {
  name: string;
  amount: Money;
  model: string;
}

interface DealsPanelProps {
  address: ReportAddress;
  openedWith: OpenedWith | null;
  /** Reloads the report after its figures changed under the panel. */
  onRefresh: () => void;
}

/** The deals behind one activity's attributed revenue (058 US1), opened from the ranked list or the address. */
export function DealsPanel({ address, openedWith, onRefresh }: DealsPanelProps) {
  const deals = useDealsAddress();
  const open = deals.address.activityId !== null;
  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          deals.close();
        }
      }}
      title={openedWith?.name ?? 'Attributed revenue'}
      description={SCOPE_SENTENCE}
      footer={
        <ExportMenu
          label="Export"
          formats={['xlsx', 'csv']}
          download={(format) =>
            downloadReport('revenue', address, format, {
              widget: 'deals',
              own: exportParams(deals.address),
            })
          }
        />
      }
    >
      {open && <FocusTitle />}
      {deals.address.activityId && (
        <DealsBody
          key={deals.address.activityId}
          address={address}
          activityId={deals.address.activityId}
          compare={deals.address.compare}
          onCompare={deals.compare}
          openedWith={openedWith}
          onRefresh={onRefresh}
        />
      )}
    </SidePanel>
  );
}

/** The panel opens on its heading, not on the close button, so reading starts at the activity's name. */
function FocusTitle() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    // After the dialog's own focus on its first button, which runs once this effect has.
    const frame = requestAnimationFrame(() => {
      const title = ref.current?.closest('[role="dialog"]')?.querySelector('h2');
      if (title) {
        title.tabIndex = -1;
        title.classList.add(styles.focusedTitle ?? '');
        title.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <span ref={ref} hidden />;
}

/** The export names the activity and the comparison through the report's own parameters. */
function exportParams(address: DealsAddress): URLSearchParams {
  const own = new URLSearchParams();
  if (address.activityId) {
    own.set('activity', address.activityId);
  }
  if (address.compare) {
    own.set(COMPARE_PARAM, address.compare);
  }
  return own;
}

interface DealsBodyProps {
  address: ReportAddress;
  activityId: string;
  compare: AttributionModel | null;
  onCompare: (model: AttributionModel | null) => void;
  openedWith: OpenedWith | null;
  onRefresh: () => void;
}

function DealsBody({
  address,
  activityId,
  compare,
  onCompare,
  openedWith,
  onRefresh,
}: DealsBodyProps) {
  const [page, setPage] = useState(1);
  const query = useActivityDeals(dealsParams(address, activityId, compare, page));
  if (query.isError) {
    return <DealsFailed error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) {
    return (
      <div className={styles.body} aria-label="Loading the deals">
        <Skeleton lines={2} height="48px" />
        <Skeleton lines={3} height="24px" />
      </div>
    );
  }
  return (
    <DealsLoaded
      data={query.data}
      compare={compare}
      onCompare={onCompare}
      page={page}
      onPage={setPage}
      changed={changedSince(query.data, openedWith)}
      onRefresh={onRefresh}
    />
  );
}

function DealsFailed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.kind === 'notFound') {
    return (
      <EmptyState
        title="We can't find this activity."
        text="It may have been deleted, or it is in a plan you can't open."
      />
    );
  }
  return (
    <div className={styles.body}>
      <p role="alert" className={styles.note}>
        We couldn't load the deals.
      </p>
      <div>
        <Button variant="primary" icon={<RotateCw />} onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

interface DealsLoadedProps {
  data: ActivityDeals;
  compare: AttributionModel | null;
  onCompare: (model: AttributionModel | null) => void;
  page: number;
  onPage: (page: number) => void;
  changed: boolean;
  onRefresh: () => void;
}

function DealsLoaded({
  data,
  compare,
  onCompare,
  page,
  onPage,
  changed,
  onRefresh,
}: DealsLoadedProps) {
  const { money } = useFormatters();
  const pages = Math.max(1, Math.ceil(data.total / data.size));
  return (
    <div className={styles.body}>
      <dl className={styles.totals}>
        <div className={styles.total}>
          <dt className={styles.totalLabel}>Credited to this activity</dt>
          <dd className={styles.totalValue}>
            {Number(data.credited.amount) === 0 ? '—' : money(data.credited)}
          </dd>
          {data.comparison && data.comparisonCredited && (
            <dd className={styles.compare}>
              {money(data.comparisonCredited)} under {data.comparison.name}
            </dd>
          )}
        </div>
        <div className={styles.total}>
          <dt className={styles.totalLabel}>Booked on this activity</dt>
          <dd className={styles.totalValue}>{data.booked ? money(data.booked) : '—'}</dd>
        </div>
      </dl>
      <p className={styles.model}>
        {data.model.name} · {data.model.description}
      </p>
      {changed && (
        <div className={styles.changed} role="status">
          <span>These figures changed since the report loaded.</span>
          <Button size="sm" variant="secondary" onClick={onRefresh}>
            Refresh the report
          </Button>
        </div>
      )}
      <Notes data={data} />
      <CompareSelect designated={data.model.key} value={compare} onChange={onCompare} />
      {data.deals.length === 0 ? (
        <NoDeals data={data} />
      ) : (
        <ul className={styles.deals} aria-label="Deals">
          {data.deals.map((d) => (
            <li key={d.id}>
              <DealCard deal={d} activity={data.activity} comparison={data.comparison} />
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <Pager
          page={page}
          pageSize={data.size}
          total={data.total}
          onPage={onPage}
          placement="below"
        />
      )}
    </div>
  );
}

function Notes({ data }: { data: ActivityDeals }) {
  return (
    <>
      {data.heldFacts > 0 && (
        <p className={styles.note}>
          {data.heldFacts} {data.heldFacts === 1 ? 'fact waits' : 'facts wait'} for their activity's
          approval and count nowhere yet.
        </p>
      )}
      {data.withoutRate > 0 && (
        <p className={styles.note}>
          {data.withoutRate} {data.withoutRate === 1 ? 'deal is' : 'deals are'} left out: no
          exchange rate for its currency.
        </p>
      )}
    </>
  );
}

function NoDeals({ data }: { data: ActivityDeals }) {
  if (data.reason === 'notApproved') {
    return (
      <EmptyState
        title="This activity isn't approved yet"
        text="Its facts are held until it is approved, so no deal counts for it yet."
      />
    );
  }
  return (
    <EmptyState
      title="No data has arrived yet"
      text={`No deal in ${data.year} credits or was booked on this activity.`}
    />
  );
}

function changedSince(data: ActivityDeals, openedWith: OpenedWith | null): boolean {
  if (!openedWith) {
    return false;
  }
  const sameAmount =
    data.credited.amount === openedWith.amount.amount &&
    data.credited.currency === openedWith.amount.currency;
  return !sameAmount || data.model.name !== openedWith.model;
}
