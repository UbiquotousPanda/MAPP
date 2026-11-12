import { ClipboardList, Plus, SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useCurrentUser, useSession } from '@/session/useSession';
import { Button, LinkButton } from '@/ui/Button/Button';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { FilterBar } from '@/ui/FilterBar/FilterBar';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { SearchField } from '@/ui/SearchField/SearchField';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { useToast } from '@/ui/Toast/useToast';
import { useAccess } from '@/session/access';
import { usePageTitle } from '@/ui/usePageTitle';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { countText } from '@/ui/ResultCount/count-text';
import { DEFAULT_FILTERS, readFilters, remember, toSearchParams } from './list-preferences';
import type { PlanListFilters } from './list-preferences';
import { NewPlanButton } from './NewPlanButton';
import { PlanCard } from './PlanCard';
import { PlansFilters } from './PlansFilters';
import styles from './PlansPage.module.css';
import { usePlans } from './api';
import type { PlanSummary } from './api';
import { chipReset, filterChips, filtersInUse } from './plan-list-chips';
import { PlanListSummary } from './PlanListSummary';
import { PlanTable } from './PlanTable';
import { MY_TEAMS_HINT } from './plan-text';
import { usePlanActions } from './usePlanActions';

const SEARCH_DELAY_MS = 250;

const MAX_PINNED_PLANS = 100;

function pinnedFirst(plans: PlanSummary[], pinnedIds: string[]): PlanSummary[] {
  const pinned = new Set(pinnedIds);
  return [
    ...plans.filter((plan) => pinned.has(plan.id)),
    ...plans.filter((plan) => !pinned.has(plan.id)),
  ];
}

export function PlansPage() {
  usePageTitle('Plans');
  const user = useCurrentUser();
  const { updatePreferences } = useSession();
  const { show } = useToast();
  const canCreate = useAccess().has('plans.create');
  const [search, setSearch] = useSearchParams();
  const filters = readFilters(search, user.id);
  const plans = usePlans({
    status: filters.status,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    types: filters.types,
    scope: filters.scope,
    bcpir: filters.bcpir,
    q: filters.q,
  });
  const actions = usePlanActions();

  function togglePin(plan: PlanSummary) {
    const pinnedIds = user.preferences.pinnedPlanIds;
    if (pinnedIds.includes(plan.id)) {
      updatePreferences({ pinnedPlanIds: pinnedIds.filter((id) => id !== plan.id) });
      return;
    }
    if (pinnedIds.length >= MAX_PINNED_PLANS) {
      show({ message: `You can pin up to ${MAX_PINNED_PLANS} plans. Unpin one first.` });
      return;
    }
    updatePreferences({ pinnedPlanIds: [...pinnedIds, plan.id] });
  }

  const isPinned = (plan: PlanSummary) => user.preferences.pinnedPlanIds.includes(plan.id);

  function change(next: Partial<PlanListFilters>) {
    setSearch(
      (current) => {
        const all = { ...readFilters(current, user.id), ...next };
        remember(user.id, all);
        return toSearchParams(all);
      },
      { replace: true },
    );
  }

  function clearFilters() {
    change({ ...DEFAULT_FILTERS, layout: filters.layout });
  }

  const chips = filterChips(filters);

  const data = plans.data;
  const summary = data?.summary;
  const planYears = data?.years ?? [];
  const showsTable = filters.layout === 'table';
  const items = data ? pinnedFirst(data.items, user.preferences.pinnedPlanIds) : [];

  function listState() {
    if (plans.isError && !data) {
      return <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />;
    }
    if (!data) {
      return <ListSkeleton />;
    }
    if (data.total === 0 && chips.length === 0) {
      return (
        <EmptyState
          icon={<ClipboardList />}
          title="No plans yet"
          text="A plan holds one year of marketing for one business."
          action={
            canCreate && (
              <LinkButton to="/plans/new" icon={<Plus />}>
                Create your first plan
              </LinkButton>
            )
          }
        />
      );
    }
    if (data.items.length === 0) {
      return (
        <EmptyState
          icon={<SearchX />}
          title="Nothing matches these filters"
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      );
    }
    return null;
  }

  const state = listState();

  return (
    <>
      <PageHeader title="Plans" actions={<NewPlanButton />} />
      <div className={styles.page}>
        <PlanListSummary summary={summary} />

        <section className={styles.list} aria-label="Plan list">
          <FilterBar
            search={
              <SearchField
                size="sm"
                delay={SEARCH_DELAY_MS}
                label="Search plans"
                placeholder="Search name or ID"
                value={filters.q}
                onChange={(q) => change({ q })}
              />
            }
            quick={
              <SegmentedFilter
                label="Status"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
                value={filters.status}
                onChange={(status) => change({ status })}
              />
            }
            inUse={filtersInUse(filters)}
            menus={<PlansFilters filters={filters} years={planYears} onChange={change} />}
            end={
              <>
                {data && (
                  <ResultCount>
                    {countText(data.items.length, data.total, { one: 'plan', many: 'plans' })}
                  </ResultCount>
                )}
                <SegmentedFilter
                  label="Layout"
                  options={[
                    { value: 'cards', label: 'Cards' },
                    { value: 'table', label: 'Table' },
                  ]}
                  value={filters.layout}
                  onChange={(layout) => change({ layout })}
                />
              </>
            }
            chips={chips}
            onRemoveChip={(key) => change(chipReset(key))}
            onClearFilters={clearFilters}
            note={filters.scope === 'myTeams' && <p className={styles.hint}>{MY_TEAMS_HINT}</p>}
          />
          <div
            aria-busy={plans.isFetching}
            className={state || showsTable ? styles.listCard : undefined}
          >
            {state ??
              (showsTable && data && (
                <PlanTable
                  plans={items}
                  actionsFor={actions.menuItems}
                  isPinned={isPinned}
                  onPinToggle={togglePin}
                />
              ))}
          </div>
        </section>

        {!state && !showsTable && data && (
          <div className={styles.cards}>
            {items.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                actions={actions.menuItems(plan)}
                pinned={isPinned(plan)}
                onPinToggle={() => togglePin(plan)}
              />
            ))}
          </div>
        )}
      </div>
      {actions.dialogs}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className={styles.skeletonList} aria-label="Loading plans">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} height="40px" />
      ))}
    </div>
  );
}
