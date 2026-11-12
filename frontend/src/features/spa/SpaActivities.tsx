import { useState } from 'react';
import { ScrollBox } from '@/features/financials';
import { Card } from '@/ui/Card/Card';
import { SortHeader } from '@/ui/SortHeader/SortHeader';
import dataTable from '@/ui/Table/Table.module.css';
import type { SpaView } from './api';
import { ActivityRow } from './ActivityRow';
import type { SortColumn, SpaSort } from './schemas';
import { firstDirection, sortRows } from './sort';
import { ACTIVITIES, COLUMNS } from './spa-text';
import styles from './Spa.module.css';

interface SpaActivitiesProps {
  view: SpaView;
  sort: SpaSort | undefined;
  onSort: (sort: SpaSort) => void;
}

const HEADERS: { column: SortColumn | 'channel'; numeric?: boolean }[] = [
  { column: 'name' },
  { column: 'campaign' },
  { column: 'owner' },
  { column: 'activityType' },
  { column: 'channel' },
  { column: 'startQuarter' },
  { column: 'status' },
  { column: 'plannedCost', numeric: true },
  { column: 'committed', numeric: true },
  { column: 'actualSpend', numeric: true },
  { column: 'variancePercent', numeric: true },
];

/** Every activity in scope with its spend, sortable, opening to its line items (013 FR-019). */
export function SpaActivities({ view, sort, onSort }: SpaActivitiesProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const rows = sortRows(view.activities, sort);

  function toggle(id: string) {
    const next = new Set(open);
    if (!next.delete(id)) next.add(id);
    setOpen(next);
  }

  return (
    <Card title={ACTIVITIES.title}>
      <ScrollBox label={ACTIVITIES.title} className={styles.scroll}>
        <table className={dataTable.table}>
          <caption className="visually-hidden">{ACTIVITIES.title}</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Line items</span>
              </th>
              {HEADERS.map(({ column, numeric }) =>
                column === 'channel' ? (
                  <th key={column} scope="col">
                    {COLUMNS.channel}
                  </th>
                ) : (
                  <SortHeading
                    key={column}
                    column={column}
                    numeric={numeric}
                    sort={sort}
                    onSort={onSort}
                  />
                ),
              )}
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ActivityRow
                key={row.id}
                row={row}
                planId={view.plan.id}
                expanded={open.has(row.id)}
                onToggle={() => toggle(row.id)}
              />
            ))}
          </tbody>
        </table>
      </ScrollBox>
    </Card>
  );
}

interface SortHeadingProps {
  column: SortColumn;
  numeric?: boolean;
  sort: SpaSort | undefined;
  onSort: (sort: SpaSort) => void;
}

function SortHeading({ column, numeric = false, sort, onSort }: SortHeadingProps) {
  const current = sort?.column === column ? sort.direction : undefined;
  const next = current ? (current === 'asc' ? 'desc' : 'asc') : firstDirection(column);
  return (
    <SortHeader
      label={COLUMNS[column] ?? column}
      direction={current}
      className={numeric ? dataTable.numeric : undefined}
      onSort={() => onSort({ column, direction: next })}
    />
  );
}
