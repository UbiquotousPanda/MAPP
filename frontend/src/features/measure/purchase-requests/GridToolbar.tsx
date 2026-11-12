import { SearchField } from '@/ui/SearchField/SearchField';
import { GridFilterBar } from '../shared';
import type { GridFilter } from '../shared';
import type { RequestsGridData } from './api';
import { ColumnChooser } from './ColumnChooser';
import type { RequestsParams } from './schemas';
import { statusWord } from './words';
import styles from './PurchaseRequests.module.css';

export interface GridToolbarProps {
  choices: RequestsGridData['choices'];
  params: RequestsParams;
  onChange: (changes: Partial<RequestsParams>) => void;
}

const SEARCH_DELAY_MS = 300;

type FilterKey = 'vendors' | 'requestOwners' | 'statuses';

function filtersOf(choices: RequestsGridData['choices']): GridFilter<FilterKey>[] {
  return [
    {
      key: 'vendors',
      label: 'Vendor',
      choices: choices.vendors.map((v) => ({
        value: v,
        label: v === 'none' ? 'Not filled in' : v,
      })),
    },
    {
      key: 'requestOwners',
      label: 'Owner',
      choices: choices.owners.map((o) => ({ value: o.id, label: o.name })),
    },
    {
      key: 'statuses',
      label: 'Status',
      choices: choices.statuses.map((s) => ({ value: s, label: statusWord(s) })),
    },
  ];
}

/** The grid's list toolbar: search · Filters (n) with vendor, owner and status · Columns; chips below. */
export function GridToolbar({ choices, params, onChange }: GridToolbarProps) {
  return (
    <GridFilterBar
      className={styles.toolbar}
      search={
        <SearchField
          size="sm"
          delay={SEARCH_DELAY_MS}
          label="Search purchase requests"
          placeholder="Search vendor, request, line item or purchase order"
          value={params.q}
          onChange={(q) => onChange({ q: q.trim() })}
        />
      }
      filters={filtersOf(choices)}
      selected={params}
      onChange={onChange}
      end={
        <ColumnChooser
          columns={params.columns}
          onChange={(columns) => onChange({ columns, page: params.page })}
        />
      }
    />
  );
}
