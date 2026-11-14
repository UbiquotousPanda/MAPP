import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import settingsStyles from '@/ui/settings-table.module.css';
import dataTable from '@/ui/Table/Table.module.css';
import { useRateImports } from './rates-api';
import type { RateImport } from './rates-api';
import styles from './rates.module.css';

/** The last 10 GSAP rate files: who imported them and when, their rate dates and review row counts. */
export function RecentImports() {
  const imports = useRateImports();
  const { date, dateTime, dateRange } = useFormatters();

  return (
    <Card title="Recent imports">
      {!imports.data ? (
        imports.isError ? (
          <ErrorState error={imports.error} onRetry={() => void imports.refetch()} />
        ) : (
          <Skeleton lines={3} height="18px" />
        )
      ) : imports.data.items.length === 0 ? (
        <p className={styles.cardNote}>No GSAP rate file has been imported yet.</p>
      ) : (
        // Nothing in the table takes the focus: the scrolling area does, for the keyboard.
        <div className={dataTable.scroll} role="region" aria-label="Recent imports" tabIndex={0}>
          <table className={dataTable.table}>
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">Imported</th>
                <th scope="col">Rates for</th>
                <th scope="col" className={dataTable.numeric}>
                  Added
                </th>
                <th scope="col" className={dataTable.numeric}>
                  Replaced
                </th>
                <th scope="col" className={dataTable.numeric}>
                  Already present
                </th>
                <th scope="col" className={dataTable.numeric}>
                  Not used
                </th>
                <th scope="col" className={dataTable.numeric}>
                  Problems
                </th>
              </tr>
            </thead>
            <tbody>
              {imports.data.items.map((item) => (
                <ImportRow
                  key={item.id}
                  item={item}
                  when={dateTime}
                  range={(first, last) => (first === last ? date(first) : dateRange(first, last))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

interface ImportRowProps {
  item: RateImport;
  when: (timestamp: string) => string;
  /** "21 Sep – 20 Oct 2026", or one date when the file had rates of one day. */
  range: (start: string, end: string) => string;
}

function ImportRow({ item, when, range }: ImportRowProps) {
  return (
    <tr>
      <th scope="row" className={settingsStyles.nowrap}>
        {item.fileName}
      </th>
      <td className={settingsStyles.nowrap}>
        {item.importedBy.name}
        <span className={settingsStyles.secondLine}>{when(item.importedAt)}</span>
      </td>
      <td className={settingsStyles.nowrap}>
        {item.firstDate && item.lastDate
          ? range(item.firstDate, item.lastDate)
          : 'No rates changed'}
      </td>
      <td className={dataTable.numeric}>{formatWhole(item.added)}</td>
      <td className={dataTable.numeric}>{formatWhole(item.replaced)}</td>
      <td className={dataTable.numeric}>{formatWhole(item.unchanged)}</td>
      <td className={dataTable.numeric}>{formatWhole(item.notUsed)}</td>
      <td className={dataTable.numeric}>{formatWhole(item.problems)}</td>
    </tr>
  );
}
