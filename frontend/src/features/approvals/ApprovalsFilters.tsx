import { useId } from 'react';
import { Button } from '@/ui/Button/Button';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import { DateField } from '@/ui/DateField/DateField';
import { FiltersButton } from '@/ui/FilterMenuButton/FilterMenuButton';
import { Popover } from '@/ui/Popover/Popover';
import { NO_FILTERS, filtersInUse } from './approval-filters';
import type { ApprovalFilterOptions, ApprovalFilterValues } from './approval-filters';
import styles from './ApprovalsFilters.module.css';

export interface ApprovalsFiltersProps {
  filters: ApprovalFilterValues;
  /** The choices, from the tab's rows. */
  options: ApprovalFilterOptions;
  onChange: (filters: ApprovalFilterValues) => void;
}

/** The choices come from the tab's rows, so no filter offers a value that matches nothing. */
export function ApprovalsFilters({ filters, options, onChange }: ApprovalsFiltersProps) {
  const id = useId();
  const inUse = filtersInUse(filters);
  const set = (change: Partial<ApprovalFilterValues>) => onChange({ ...filters, ...change });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <FiltersButton count={inUse} />
      </Popover.Trigger>
      <Popover.Content width="lg" padding="lg" sideOffset={8} aria-label="Filters">
        <div className={styles.fields}>
          <ChoiceField
            label="Record type"
            name={`${id}-kind`}
            options={options.kinds}
            value={filters.kind}
            onChange={(kind) => set({ kind })}
          />
          <ChoiceField
            label="Plan"
            name={`${id}-plan`}
            options={options.plans}
            value={filters.planId}
            onChange={(planId) => set({ planId })}
          />
          <ChoiceField
            label="Approval workflow"
            name={`${id}-workflow`}
            options={options.workflows}
            value={filters.workflowId}
            onChange={(workflowId) => set({ workflowId })}
          />
          <ChoiceField
            label="Owner"
            name={`${id}-owner`}
            options={options.owners}
            value={filters.ownerId}
            onChange={(ownerId) => set({ ownerId })}
          />
          <div className={styles.dates}>
            <DateField
              name={`${id}-from`}
              label="Submitted from"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(from) => set({ from })}
            />
            <DateField
              name={`${id}-to`}
              label="Submitted to"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(to) => set({ to })}
            />
          </div>
        </div>
        {inUse > 0 && (
          <div className={styles.footer}>
            <Button variant="tertiary" size="sm" onClick={() => onChange(NO_FILTERS)}>
              Clear filters
            </Button>
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
