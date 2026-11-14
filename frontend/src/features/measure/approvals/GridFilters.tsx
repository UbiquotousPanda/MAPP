import { SearchField } from '@/ui/SearchField/SearchField';
import { GridFilterBar } from '../shared';
import type { GridFilter } from '../shared';
import type { ApprovalsGridData } from './api';
import type { ApprovalsParams } from './schemas';
import { OUTCOME_WORDS, recordWord } from './words';
import styles from './ApprovalsGrid.module.css';

export interface GridFiltersProps {
  choices: ApprovalsGridData['choices'];
  params: ApprovalsParams;
  onChange: (changes: Partial<ApprovalsParams>) => void;
}

const SEARCH_DELAY_MS = 300;

type FilterKey = 'recordTypes' | 'outcomes' | 'approvers';

function filtersOf(choices: ApprovalsGridData['choices']): GridFilter<FilterKey>[] {
  return [
    {
      key: 'recordTypes',
      label: 'Record type',
      choices: choices.recordTypes.map((type) => ({ value: type, label: recordWord(type) })),
    },
    {
      key: 'outcomes',
      label: 'Status',
      choices: choices.outcomes.map((o) => ({ value: o, label: OUTCOME_WORDS[o] ?? o })),
    },
    {
      key: 'approvers',
      label: 'Approver',
      choices: choices.approvers.map((p) => ({ value: p.id, label: p.name })),
    },
  ];
}

export function GridFilters({ choices, params, onChange }: GridFiltersProps) {
  return (
    <GridFilterBar
      className={styles.toolbar}
      search={
        <SearchField
          size="sm"
          delay={SEARCH_DELAY_MS}
          label="Search approvals"
          placeholder="Search name, approver, owner or comment"
          value={params.q}
          onChange={(q) => onChange({ q: q.trim() })}
        />
      }
      filters={filtersOf(choices)}
      selected={params}
      onChange={onChange}
    />
  );
}
