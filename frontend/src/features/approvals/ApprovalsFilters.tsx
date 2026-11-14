import { DateRangeMenu } from '@/ui/DateRangeMenu/DateRangeMenu';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import type { ChoiceOption } from '@/ui/ChoiceField/ChoiceField';
import type { ApprovalFilterOptions, ApprovalFilterValues } from './approval-filters';

export interface ApprovalsFiltersProps {
  filters: ApprovalFilterValues;
  /** The choices, from the tab's rows. */
  options: ApprovalFilterOptions;
  onChange: (filters: ApprovalFilterValues) => void;
}

type OneValueKey = 'kind' | 'planId' | 'workflowId' | 'ownerId';

/** The choices come from the tab's rows, so no filter offers a value that matches nothing. */
export function ApprovalsFilters({ filters, options, onChange }: ApprovalsFiltersProps) {
  const set = (change: Partial<ApprovalFilterValues>) => onChange({ ...filters, ...change });
  const menu = (key: OneValueKey, label: string, any: string, choices: ChoiceOption[]) => (
    <FilterMenu
      label={label}
      multiple={false}
      choices={[
        { value: '', label: any },
        ...choices.map((choice) => ({ value: choice.id, label: choice.label })),
      ]}
      selected={[filters[key]]}
      summary={
        filters[key]
          ? (choices.find((c) => c.id === filters[key])?.label ?? filters[key])
          : undefined
      }
      onChange={([value = '']) => set({ [key]: value })}
    />
  );
  return (
    <>
      {menu('kind', 'Record type', 'Any record type', options.kinds)}
      {menu('planId', 'Plan', 'Any plan', options.plans)}
      {menu('workflowId', 'Approval workflow', 'Any workflow', options.workflows)}
      {menu('ownerId', 'Owner', 'Anyone', options.owners)}
      <DateRangeMenu
        label="Submitted"
        legend="Submitted between"
        from={filters.from}
        to={filters.to}
        onChange={(from, to) => set({ from, to })}
      />
    </>
  );
}
