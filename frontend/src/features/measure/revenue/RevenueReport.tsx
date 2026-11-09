import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormatters } from '@/format/useFormatters';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { RankedList, ReportFrame, useRankedState } from '../shared';
import type {
  Money,
  RankedColumn,
  RankedEntryData,
  ReportAddress,
  ReportFrameData,
} from '../shared';
import { useRevenueReport, useRevenueRanked } from './api';
import type { RevenueFigures, RevenueRanked, RevenueRankedParams } from './api';
import { CategorySelect } from './CategorySelect';
import { useDealsAddress } from './deals/address';
import { DealsPanel } from './deals/DealsPanel';
import type { OpenedWith } from './deals/DealsPanel';
import { RevenueCards } from './RevenueCards';
import { RevenueChart } from './RevenueChart';
import { reasonText } from './reasons';
import styles from './Revenue.module.css';
import { useOwnParam } from './useOwnParam';
import { performanceText } from './variance';

const LEVELS = ['plan', 'campaign', 'initiative', 'activity'];
const DEFAULT_SORT = 'projectedRevenue';

/** Revenue against goal (feature 049 US1): cards, the period series and 040's ranked list, in 039's frame. */
export function RevenueReport() {
  return (
    <ReportFrame report="revenue" period show="campaign">
      {(frame, address) => <RevenueBody frame={frame} address={address} />}
    </ReportFrame>
  );
}

function RevenueBody({ frame, address }: { frame: ReportFrameData; address: ReportAddress }) {
  const { money } = useFormatters();
  const [category, setCategory] = useOwnParam('category');
  const report = useRevenueReport(address, { category: category || undefined });
  const { state } = useRankedState(DEFAULT_SORT);
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
    if (!amount || entry.level !== 'activity') {
      return amount ? money(amount) : reasonText(f.attributedRevenueReason);
    }
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
    { key: 'goal', label: 'Goal', value: (f) => (f.goal ? money(f.goal) : '—'), sortable: false },
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
      sortable: false,
    },
    {
      key: 'attributedRevenue',
      label: attributedLabel(ranked.data?.attribution),
      value: (f) =>
        f.attributedRevenue ? money(f.attributedRevenue) : reasonText(f.attributedRevenueReason),
      render: attributedCell,
      sortable: false,
    },
    {
      key: 'actualCost',
      label: 'Actual cost',
      value: (f) => (f.actualCost ? money(f.actualCost) : reasonText(f.actualCostReason)),
      sortable: false,
    },
    {
      key: 'roi',
      label: roiLabel(ranked.data?.attribution),
      value: (f) => (f.roi !== null ? `${f.roi}%` : reasonText(f.roiReason)),
      sortable: false,
    },
    { key: 'model', label: 'Model', value: (f) => f.projection?.modelName ?? '—', sortable: false },
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
      <div className={styles.controls}>
        <CategorySelect value={category} onChange={setCategory} />
      </div>
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
        report="revenue"
        owner
        data={ranked.data}
        error={ranked.isError ? ranked.error : null}
        onRetry={() => void ranked.refetch()}
        columns={columns}
        groups={groups}
        defaultSort={DEFAULT_SORT}
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

/** The model behind attributed revenue and the cost an ROI divides by, named beside them. */
function attributedLabel(stamp: Attribution | undefined): string {
  return stamp ? `Attributed revenue (${stamp.model})` : 'Attributed revenue';
}

function roiLabel(stamp: Attribution | undefined): string {
  return stamp ? `ROI (${stamp.model}, on ${stamp.basis} cost)` : 'ROI';
}

function rankedParams(
  state: ReturnType<typeof useRankedState>['state'],
  category: string,
): RevenueRankedParams {
  const sorts = ['actualRevenue', 'projectedRevenue'] as const;
  return {
    sort: sorts.find((s) => s === state.sort) ?? 'projectedRevenue',
    order: state.order,
    size: state.size,
    page: state.page,
    ...(state.group !== 'none' && { group: state.group }),
    ...(state.q && { q: state.q }),
    ...(state.drill && { drill: state.drill }),
    ...(category && { category }),
  };
}
