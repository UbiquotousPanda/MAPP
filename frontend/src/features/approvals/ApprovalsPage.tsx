import { CircleCheckBig, SearchX, UserRoundCog } from 'lucide-react';
import { useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { FilterBar } from '@/ui/FilterBar/FilterBar';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { SearchField } from '@/ui/SearchField/SearchField';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { Tabs } from '@/ui/Tabs/Tabs';
import type { TabItem } from '@/ui/Tabs/Tabs';
import type { components } from '@/api/generated/schema';
import { usePageTitle } from '@/ui/usePageTitle';
import { useFormatters } from '@/format/useFormatters';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { countText } from '@/ui/ResultCount/count-text';
import {
  NO_FILTERS,
  applyFilters,
  filterChips,
  filterOptions,
  filterParams,
  filtersInUse,
  filtersOf,
  isFilterKey,
} from './approval-filters';
import type { ApprovalFilterValues } from './approval-filters';
import { ApprovalPreviewPanel } from './ApprovalPreviewPanel';
import { useApprovalRows } from './api';
import type { ApprovalRow, ApprovalTab } from './api';
import { ApprovalsFilters } from './ApprovalsFilters';
import { ApprovalsTable } from './ApprovalsTable';
import { DelegationBanner } from './DelegationBanner';
import { DelegationPanel } from './DelegationPanel';
import { MonitoringView } from './MonitoringView';
import { PurchaseRequestPreviewPanel } from './PurchaseRequestPreviewPanel';
import { approvalsAddressOf, previewParams } from './schemas';
import type { PageTab, PreviewSubject } from './schemas';
import { useApprovalSummary } from './useApprovalSummary';
import { useChosenTabInView } from './useChosenTabInView';
import styles from './ApprovalsPage.module.css';

type ApprovalCounts = components['schemas']['ApprovalCounts'];

// The address follows the typing a moment later, so a quick key never lands on an older address.
const SEARCH_DELAY_MS = 200;

const EMPTY_TAB: Record<ApprovalTab, string> = {
  waiting: "Nothing is waiting for you. You're all caught up.",
  open: 'No activities are waiting for approval.',
  decided: "You haven't approved or declined any activities yet.",
};

export function ApprovalsPage() {
  usePageTitle('Approvals');
  const [params, setParams] = useSearchParams();
  const { tab: chosenTab, previewId, previewKind, delegationsOpen } = approvalsAddressOf(params);
  const search = params.get('q') ?? '';
  const filters = filtersOf(params);
  const { date } = useFormatters();
  const summary = useApprovalSummary();
  const landingTab = landingTabOf(summary.data, summary.isError);
  const tab: PageTab = chosenTab ?? landingTab ?? 'waiting';
  const listTab: ApprovalTab = tab === 'monitoring' ? 'open' : tab;
  const rows = useApprovalRows(
    listTab,
    tab !== 'monitoring' && (chosenTab !== null || landingTab !== null),
  );
  const allRows = rows.data?.items ?? [];
  const visible = applyFilters(allRows, search, filters);
  const tabsArea = useRef<HTMLDivElement>(null);
  useChosenTabInView(tabsArea, tab);

  function changeParams(change: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(change)) {
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setParams(next, { replace });
  }

  const setSearch = (q: string) => changeParams({ q: q || null }, true);
  const setFilters = (next: ApprovalFilterValues) => changeParams(filterParams(next), true);
  const options = filterOptions(allRows);

  function moveOn(decidedId: string, before: ApprovalRow[]) {
    const subjects = before.map((row) => row.subject);
    const index = subjects.findIndex((subject) => subject.id === decidedId);
    const next = subjects[index + 1] ?? subjects.find((subject) => subject.id !== decidedId);
    changeParams(previewParams(next ?? null), true);
  }

  const counts = summary.data;
  const tabs: TabItem<PageTab>[] = [
    { value: 'waiting', label: 'Waiting for me' },
    { value: 'open', label: 'All open' },
    { value: 'decided', label: 'Decided by me' },
    { value: 'monitoring', label: 'Monitoring' },
  ];
  const openPreview = (subject: PreviewSubject) => changeParams(previewParams(subject));

  return (
    <>
      <PageHeader
        title="Approvals"
        actions={
          <Button icon={<UserRoundCog />} onClick={() => changeParams({ panel: 'delegations' })}>
            Delegate my approvals
          </Button>
        }
      />
      <div className={styles.sections}>
        <DelegationBanner />
        <SummaryCards counts={counts} failed={summary.isError} />

        <div ref={tabsArea}>
          <Tabs
            label="Approvals"
            tabs={tabs}
            value={tab}
            onChange={(value) => changeParams({ tab: value })}
          >
            {tab === 'monitoring' ? (
              <MonitoringView onOpen={openPreview} />
            ) : (
              <Card>
                <FilterBar
                  className={styles.toolbar}
                  search={
                    <SearchField
                      size="sm"
                      delay={SEARCH_DELAY_MS}
                      label="Search activity name or ID"
                      placeholder="Search activity name or ID"
                      value={search}
                      onChange={setSearch}
                    />
                  }
                  inUse={filtersInUse(filters)}
                  menus={
                    <ApprovalsFilters filters={filters} options={options} onChange={setFilters} />
                  }
                  end={
                    rows.data && (
                      <ResultCount>
                        {countText(visible.length, allRows.length, {
                          one: 'activity',
                          many: 'activities',
                        })}
                      </ResultCount>
                    )
                  }
                  chips={filterChips(filters, options, date)}
                  onRemoveChip={(key) => {
                    if (isFilterKey(key)) {
                      setFilters({ ...filters, [key]: '' });
                    }
                  }}
                  onClearFilters={() => setFilters(NO_FILTERS)}
                />
                {rows.data ? (
                  visible.length > 0 ? (
                    <ApprovalsTable rows={visible} tab={listTab} onOpen={openPreview} />
                  ) : allRows.length > 0 ? (
                    <EmptyState
                      icon={<SearchX />}
                      title="Nothing matches these filters"
                      action={
                        <Button
                          onClick={() =>
                            changeParams({ q: null, ...filterParams(NO_FILTERS) }, true)
                          }
                        >
                          Clear filters
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState icon={<CircleCheckBig />} title={EMPTY_TAB[listTab]} />
                  )
                ) : rows.isError ? (
                  <ErrorState error={rows.error} onRetry={() => void rows.refetch()} />
                ) : (
                  <Skeleton lines={6} height="18px" />
                )}
              </Card>
            )}
          </Tabs>
        </div>
      </div>

      {previewId &&
        (previewKind === 'activity' ? (
          <ApprovalPreviewPanel
            activityId={previewId}
            onClose={() => changeParams(previewParams(null))}
            onDecided={() => moveOn(previewId, visible)}
          />
        ) : (
          <PurchaseRequestPreviewPanel
            purchaseRequestId={previewId}
            onClose={() => changeParams(previewParams(null))}
            onDecided={() => moveOn(previewId, visible)}
          />
        ))}
      {delegationsOpen && <DelegationPanel onClose={() => changeParams({ panel: null })} />}
    </>
  );
}

function landingTabOf(counts: ApprovalCounts | undefined, failed: boolean): ApprovalTab | null {
  if (counts) {
    return counts.waitingForMe > 0 ? 'waiting' : 'open';
  }
  return failed ? 'waiting' : null;
}

interface SummaryCardsProps {
  counts: ApprovalCounts | undefined;
  failed: boolean;
}

function SummaryCards({ counts, failed }: SummaryCardsProps) {
  if (!counts && !failed) {
    return (
      <div className={styles.summary}>
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} height="104px" />
        ))}
      </div>
    );
  }
  const value = (count: number | undefined) => (count === undefined ? '—' : count);
  return (
    <div className={styles.summary}>
      <SummaryCard
        label="Waiting for me"
        value={value(counts?.waitingForMe)}
        tip="Submitted activities whose current approval level lists you."
        tone={counts && counts.waitingForMe > 0 ? 'review' : undefined}
      />
      <SummaryCard
        label="All open"
        value={value(counts?.allOpen)}
        tip="Every activity waiting for approval, at any level."
      />
      <SummaryCard
        label="Approved this month"
        value={value(counts?.approvedThisMonth)}
        tip="Activities that got their final approval this calendar month."
      />
      <SummaryCard
        label="Declined this month"
        value={value(counts?.declinedThisMonth)}
        tip="Activities declined this calendar month."
      />
    </div>
  );
}
