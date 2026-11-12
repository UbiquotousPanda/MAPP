import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useId } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useFormatters } from '@/format/useFormatters';
import { Pager as SharedPager } from '@/ui/Pager/Pager';
import { downloadReport, ExportMenu, useReportAddress } from '../shared';
import type { UserAccessRow } from './api';
import { PAGE_SIZES, sortOf } from './access-address';
import type { AccessTable as Table } from './access-address';
import { personHref, rolesText, teamsText } from './access-text';
import styles from './UserAccess.module.css';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'E-mail' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'roles', label: 'Roles' },
  { key: 'teams', label: 'Teams' },
  { key: 'status', label: 'Status' },
  { key: 'lastSignedIn', label: 'Last sign-in', latestFirst: true },
];

interface AccessTableProps {
  rows: UserAccessRow[];
  total: number;
  table: Table;
  onChange: (patch: Partial<Table>) => void;
}

/** Everyone matching, sorted by any column with Never always last, a row opening Settings › People. */
export function AccessTable({ rows, total, table, onChange }: AccessTableProps) {
  const headingId = useId();
  const [address] = useReportAddress();
  const [own] = useSearchParams();
  const { dateTime } = useFormatters();
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHeader}>
        <h2 id={headingId} className={styles.heading}>
          People
        </h2>
        <ExportMenu
          label="Export"
          formats={['xlsx', 'csv']}
          download={(format) =>
            downloadReport('userAccess', address, format, { widget: 'people', own })
          }
        />
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className="visually-hidden">People</caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <SortHeading
                  key={column.key}
                  column={column}
                  sort={table.sort}
                  onSort={(sort) => onChange({ sort })}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.person.id}>
                <td>
                  <Link to={personHref(row.person.id)}>{row.person.name}</Link>
                </td>
                <td>{row.email}</td>
                <td>{row.person.jobTitle || '—'}</td>
                <td>
                  {row.roles.length === 0 ? (
                    'No role'
                  ) : (
                    <ul className={styles.list}>
                      {rolesText(row).map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>{teamsText(row) || '—'}</td>
                <td>{row.person.active ? 'Active' : 'Inactive'}</td>
                <td>
                  {row.lastSignedInAt ? (
                    dateTime(row.lastSignedInAt)
                  ) : (
                    <span className={styles.never}>Never</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager table={table} total={total} onChange={onChange} />
    </section>
  );
}

interface SortHeadingProps {
  column: (typeof COLUMNS)[number];
  sort: string;
  onSort: (sort: Table['sort']) => void;
}

/** A heading that sorts by its column; a second click turns the order round. */
function SortHeading({ column, sort, onSort }: SortHeadingProps) {
  const current = sort.replace(/^-/, '') === column.key;
  const descending = sort.startsWith('-');
  const Icon = !current ? ArrowUpDown : descending ? ArrowDown : ArrowUp;
  const next = current ? !descending : Boolean(column.latestFirst);
  return (
    <th scope="col" aria-sort={current ? (descending ? 'descending' : 'ascending') : 'none'}>
      <button
        type="button"
        className={styles.sort}
        onClick={() => onSort(sortOf(`${next ? '-' : ''}${column.key}`))}
      >
        {column.label}
        <Icon aria-hidden="true" className={current ? undefined : styles.idle} />
      </button>
    </th>
  );
}

function Pager({ table, total, onChange }: Omit<AccessTableProps, 'rows'>) {
  return (
    <SharedPager
      className={styles.pager}
      page={table.page}
      pageSize={table.pageSize}
      total={total}
      sizes={PAGE_SIZES}
      onPage={(page) => onChange({ page })}
      onPageSize={(pageSize) => onChange({ pageSize })}
    />
  );
}
