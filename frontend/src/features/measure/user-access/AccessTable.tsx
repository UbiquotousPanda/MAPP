import { useId } from 'react';
import { Link } from 'react-router';
import { useAddressParams } from '@/ui/useAddressParams';
import { useFormatters } from '@/format/useFormatters';
import { cx } from '@/ui/cx';
import { Pager } from '@/ui/Pager/Pager';
import { SortHeader } from '@/ui/SortHeader/SortHeader';
import dataTable from '@/ui/Table/Table.module.css';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
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
  const [own] = useAddressParams();
  const { dateTime } = useFormatters();
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHeader}>
        <SectionHeading level={2} rank="card" id={headingId}>
          People
        </SectionHeading>
        <ExportMenu
          label="Export"
          formats={['xlsx', 'csv']}
          download={(format) =>
            downloadReport('planData', address, format, { widget: 'people', own })
          }
        />
      </div>
      <div className={dataTable.scroll}>
        <table className={cx(dataTable.table, styles.table)}>
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
      <Pager
        placement="cardFooter"
        page={table.page}
        pageSize={table.pageSize}
        total={total}
        sizes={PAGE_SIZES}
        onPage={(page) => onChange({ page })}
        onPageSize={(pageSize) => onChange({ pageSize })}
      />
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
  const next = current ? !descending : Boolean(column.latestFirst);
  return (
    <SortHeader
      label={column.label}
      direction={current ? (descending ? 'desc' : 'asc') : undefined}
      onSort={() => onSort(sortOf(`${next ? '-' : ''}${column.key}`))}
    />
  );
}
