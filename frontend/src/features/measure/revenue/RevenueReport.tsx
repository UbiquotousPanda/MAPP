import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormatters } from '@/format/useFormatters';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { RankedList, useRankedState } from '../shared';
import type {
  Money,
  RankedColumn,
  RankedEntryData,
  ReportAddress,
  ReportFrameData,
} from '../shared';
import { useRevenueReport, useRevenueRanked } from './api';
import type { RevenueFigures, RevenueRanked, RevenueRankedParams } from './api';
import { useDealsAddress } from './deals/address';
import { DealsPanel } from './deals/DealsPanel';
import type { OpenedWith } from './deals/DealsPanel';
import { RevenueCards } from './RevenueCards';
import { RevenueChart } from './RevenueChart';
import { reasonText } from './reasons';
import styles from './Revenue.module.css';
import { useOwnParam } from '../shared/useOwnParam';
import { performanceText } from './variance';
import { PerformanceCell } from './PerformanceCell';

const LEVELS = ['plan', 'campaign', 'initiative', 'activity'];
const DEFAULT_SORT = 'performance';
const DEFAULT_ORDER = 'asc';

/** Revenue against goal (049 US1): cards, the period series, the ranked list and the deals (058). */
export function RevenueBody({
  frame,
  address,
}: {
  frame: ReportFrameData;
  address: ReportAddress;
}) {
  const { money } = useFormatters();
  const [category] = useOwnParam('category');
  const report = useRevenueReport(address, { category: category || undefined });
  const { state } = useRankedState(DEFAULT_SORT, DEFAULT_ORDER);
  const ranked = useRevenueRanked(address, rankedParams(state, category));
  const show = address.show ?? 'campaign';
  const queryClient = useQueryClient();
  const [openedWith, setOpenedWith] = useState<OpenedWith | null>(null);
  const deals = useDealsAddress();
  const openDeals = (entry: RankedEntryData<RevenueFigures>, amount: Money) => {
    setOpenedWith({ name: entry.name, amount, model: ranked.data?.attribution.model ?? '' });
    deals.open(entry.id);
  };
  const refreshReport = () => {
    setOpenedWith(null);
    void queryClient.invalidateQueries({ queryKey: ['reports', 'revenue'] });
  };
  const attributedCell = (f: RevenueFigures, entry: RankedEntryData<RevenueFigures>) => {
    const amount = f.attributedRevenue;
    if (!amount || entry.level !== 'activity') return amount ? money(amount) : '—';
    return (
      <button
        type="button"
        className={styles.figureButton}
        aria-label={`Attributed revenue of ${entry.name}: ${money(amount)} — see the deals`}
        onClick={() => openDeals(entry, amount)}
      >
        {money(amount)}
      </button>
    );
  };
  const columns: RankedColumn<RevenueFigures>[] = [
    { key: 'goal', label: 'Goal', value: (f) => (f.goal ? money(f.goal) : '—') },
    {
      key: 'actualRevenue',
      label: 'Actual',
      value: (f) => (f.actual ? money(f.actual) : '—'),
    },
    {
      key: 'projectedRevenue',
      label: 'Projected',
      value: (f) => (f.projected ? money(f.projected) : '—'),
    },
    {
      key: 'performance',
      label: 'Performance',
      value: (f) => performanceText(f.performance, f.variance),
      render: (f) => <PerformanceCell figures={f} />,
    },
    {
      key: 'attributedRevenue',
      label: 'Attributed revenue',
      value: (f) =>
        f.attributedRevenue ? money(f.attributedRevenue) : reasonText(f.attributedRevenueReason),
      render: attributedCell,
      empty: (f) => (f.attributedRevenue ? undefined : reasonText(f.attributedRevenueReason)),
      sortable: false,
    },
    {
      key: 'actualCost',
      label: 'Actual cost',
      value: (f) => (f.actualCost ? money(f.actualCost) : reasonText(f.actualCostReason)),
      empty: (f) => (f.actualCost ? undefined : reasonText(f.actualCostReason)),
    },
    {
      key: 'roi',
      label: 'ROI',
      value: (f) => (f.roi !== null ? `${f.roi}%` : reasonText(f.roiReason)),
      empty: (f) => (f.roi !== null ? undefined : reasonText(f.roiReason)),
    },
    {
      key: 'model',
      label: 'Projection model',
      value: (f) => f.projection?.modelName ?? '—',
      sortable: false,
    },
  ];
  const { plans, of } = frame.finance;
  const groups = [
    { value: 'none', label: 'None' },
    { value: 'plan', label: 'Plan' },
    { value: 'owner', label: 'Owner' },
    ...frame.choices.attributeGroups
      .filter((g) => LEVELS.includes(g.level) && LEVELS.indexOf(g.level) <= LEVELS.indexOf(show))
      .map((g) => ({ value: `attr:${g.attributeId}`, label: g.label })),
  ];
  return (
    <div className={styles.body}>
      {report.data ? (
        <>
          <RevenueCards cards={report.data.cards} projections={report.data.projections} />
          <RevenueChart report={report.data} />
        </>
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <div aria-label="Loading the figures">
          <Skeleton lines={4} height="24px" />
        </div>
      )}
      <RankedList
        levelFallback="campaign"
        report="performance"
        owner
        data={ranked.data}
        error={ranked.isError ? ranked.error : null}
        onRetry={() => void ranked.refetch()}
        columns={columns}
        groups={groups}
        defaultSort={DEFAULT_SORT}
        defaultOrder={DEFAULT_ORDER}
        caption={ranked.data && attributionCaption(ranked.data.attribution)}
      />
      {plans > 0 && plans < of && (
        <p className={styles.note}>
          Actual cost and ROI leave out the plans whose financial data you may not see.
        </p>
      )}
      <DealsPanel address={address} openedWith={openedWith} onRefresh={refreshReport} />
    </div>
  );
}

type Attribution = RevenueRanked['attribution'];

const MODEL_WORDS: Record<string, string> = {
  'First touch': 'all to the first step',
  'Last touch': 'all to the last step',
  'Equally distributed': 'split equally across the steps',
  'Linear time decay': 'more to each later step',
  'U-shaped': 'most to the first and last steps',
};

/** The model behind attributed revenue and the cost an ROI divides by, said once in plain words. */
function attributionCaption(stamp: Attribution): string {
  const credit = MODEL_WORDS[stamp.model] ?? stamp.model;
  return `Revenue credit: ${credit} · ROI on ${stamp.basis} cost`;
}

function rankedParams(
  state: ReturnType<typeof useRankedState>['state'],
  category: string,
): RevenueRankedParams {
  const sorts = [
    'actualRevenue',
    'projectedRevenue',
    'goal',
    'performance',
    'actualCost',
    'roi',
  ] as const;
  return {
    sort: sorts.find((s) => s === state.sort) ?? DEFAULT_SORT,
    order: state.order,
    size: state.size,
    page: state.page,
    ...(state.group !== 'none' && { group: state.group }),
    ...(state.q && { q: state.q }),
    ...(state.drill && { drill: state.drill }),
    ...(category && { category }),
  };
}
