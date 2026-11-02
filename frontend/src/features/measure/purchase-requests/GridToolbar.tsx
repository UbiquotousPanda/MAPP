import { useEffect, useState } from 'react';
import { SearchField } from '@/ui/SearchField/SearchField';
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

function Choice(props: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      {props.label}
      <select
        className={styles.select}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="">All</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GridToolbar({ choices, params, onChange }: GridToolbarProps) {
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? params.q;
  useEffect(() => {
    if (typed === null) {
      return;
    }
    const timer = setTimeout(() => {
      onChange({ q: typed.trim() });
      setTyped(null);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed, onChange]);
  return (
    <div className={styles.toolbar}>
      <SearchField
        label="Search purchase requests"
        placeholder="Search vendor, request, line item or purchase order"
        value={text}
        onChange={setTyped}
      />
      <Choice
        label="Vendor"
        value={params.vendors[0] ?? ''}
        options={choices.vendors.map((v) => ({
          value: v,
          label: v === 'none' ? 'Not filled in' : v,
        }))}
        onChange={(value) => onChange({ vendors: value ? [value] : [] })}
      />
      <Choice
        label="Owner"
        value={params.requestOwners[0] ?? ''}
        options={choices.owners.map((o) => ({ value: o.id, label: o.name }))}
        onChange={(value) => onChange({ requestOwners: value ? [value] : [] })}
      />
      <Choice
        label="Status"
        value={params.statuses[0] ?? ''}
        options={choices.statuses.map((s) => ({ value: s, label: statusWord(s) }))}
        onChange={(value) => onChange({ statuses: value ? [value] : [] })}
      />
      <ColumnChooser
        columns={params.columns}
        onChange={(columns) => onChange({ columns, page: params.page })}
      />
    </div>
  );
}
