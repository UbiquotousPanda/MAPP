import { FilterChips } from '@/ui/FilterChips/FilterChips';
import type { FilterChip } from '@/ui/FilterChips/FilterChips';
import { Select } from '@/ui/Select/Select';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { countText } from '@/ui/ResultCount/count-text';
import type { FinancialRecordRef, FinancialTransactionPage } from './api';
import { DelayedSearch } from './DelayedSearch';
import { clearedFilters } from './financials-links';
import type { FinancialFilters } from './financials-links';
import { TRANSACTIONS } from './financials-text';
import styles from './FinancialsPage.module.css';

const LEVEL_WORDS: Record<FinancialRecordRef['type'], string> = {
  plan: 'Plan',
  campaign: 'Campaign',
  initiative: 'Initiative',
  activity: 'Activity',
  lineItem: 'Line item',
  purchaseRequest: 'Purchase request',
  purchaseRequestLine: 'PR line',
};

interface FinancialsToolbarProps {
  filters: FinancialFilters;
  page: FinancialTransactionPage | undefined;
  onChange: (patch: Partial<FinancialFilters>, replace?: boolean) => void;
}

/** Search, Year and Plan, the count at the end; the record and plan filters as chips below. */
export function FinancialsToolbar({ filters, page, onChange }: FinancialsToolbarProps) {
  const choices = page?.choices;
  const year = filters.year ?? page?.year ?? choices?.currentYear;
  const years = withChosen(choices?.years ?? [], year);
  const plans = choices?.plans ?? [];
  const planName = plans.find((plan) => plan.id === filters.planId)?.name ?? filters.planId;

  const chips: FilterChip[] = [];
  if (filters.recordId) {
    const record = page?.recordFilter;
    chips.push({
      key: 'recordId',
      label: record
        ? `${LEVEL_WORDS[record.type]}: ${record.name} (${record.id})`
        : `Record: ${filters.recordId}`,
    });
  }
  if (filters.planId) {
    chips.push({ key: 'planId', label: `Plan: ${planName}` });
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <div className={styles.search}>
          <DelayedSearch value={filters.q} onChange={(q) => onChange({ q }, true)} />
        </div>
        <Select
          label="Year"
          value={year === undefined ? '' : String(year)}
          options={years.map((choice) => ({ value: String(choice), label: String(choice) }))}
          onChange={(value) => onChange({ year: Number(value), planId: '' })}
        />
        <Select
          label="Plan"
          value={filters.planId}
          options={planOptions(plans, filters.planId)}
          onChange={(planId) => onChange({ planId })}
        />
        {page && <ResultCount>{countText(page.total, page.counts.all, TRANSACTIONS)}</ResultCount>}
      </div>
      <FilterChips
        chips={chips}
        onRemove={(key) => onChange({ [key]: '' })}
        onClearAll={() => onChange(clearedFilters(filters))}
      />
    </div>
  );
}

/** The years to offer, with the chosen one even when no plan or transaction has it. */
function withChosen(years: number[], chosen: number | undefined): number[] {
  return chosen === undefined || years.includes(chosen)
    ? years
    : [...years, chosen].sort((a, b) => b - a);
}

/** All plans, the year's plans, and the chosen one when the year has no such plan (an old link). */
function planOptions(plans: { id: string; name: string }[], chosen: string) {
  const options = [{ value: '', label: 'All plans' }];
  options.push(...plans.map((plan) => ({ value: plan.id, label: plan.name })));
  if (chosen && !plans.some((plan) => plan.id === chosen)) {
    options.push({ value: chosen, label: chosen });
  }
  return options;
}
