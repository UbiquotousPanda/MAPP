import { Pager } from '@/ui/Pager/Pager';
import { SearchField } from '@/ui/SearchField/SearchField';
import { Select } from '@/ui/Select/Select';
import type { RankedState } from './ranked-params';
import styles from './RankedList.module.css';

export interface Choice {
  value: string;
  label: string;
}

interface RankedControlsProps {
  state: RankedState;
  groups: Choice[];
  onChange: (patch: Partial<RankedState>) => void;
}

/** Group by and the name search; the columns' headers sort, and the page size sits with the pages. */
export function RankedControls({ state, groups, onChange }: RankedControlsProps) {
  return (
    <div className={styles.controls}>
      <Select
        label="Group by"
        value={state.group}
        options={groups}
        onChange={(group) => onChange({ group })}
      />
      <div className={styles.search}>
        <SearchField
          label="Search by name"
          placeholder="Search by name"
          value={state.q}
          onChange={(q) => onChange({ q })}
        />
      </div>
    </div>
  );
}

interface PagingProps {
  state: RankedState;
  total: number;
  onChange: (patch: Partial<RankedState>) => void;
}

const SIZES = [10, 25, 50] as const;

export function Paging({ state, total, onChange }: PagingProps) {
  return (
    <Pager
      className={styles.paging}
      page={state.page}
      pageSize={state.size}
      total={total}
      sizes={SIZES}
      onPage={(page) => onChange({ page })}
      onPageSize={(size) => onChange({ size })}
    />
  );
}
