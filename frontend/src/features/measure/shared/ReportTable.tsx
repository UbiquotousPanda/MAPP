import styles from './ReportWidget.module.css';
import totals from './TotalRow.module.css';

export interface ReportTableColumn {
  label: string;
  numeric?: boolean;
}

export interface ReportTableRow {
  key: string;
  cells: string[];
}

export interface ReportTableData {
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  /** The totals row, where the widget totals. */
  total?: string[];
}

/** A widget's table view: every value the chart draws, with the same labels, then the totals. */
export function ReportTable({ title, data }: { title: string; data: ReportTableData }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.caption}>{title}</caption>
        <thead>
          <tr>
            {data.columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={column.numeric ? styles.numeric : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, i) => (
                <td
                  key={data.columns[i]?.label ?? i}
                  className={data.columns[i]?.numeric ? styles.numeric : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {data.total && (
          <tfoot>
            <tr className={totals.total}>
              {data.total.map((cell, i) => {
                const Cell = i === 0 ? 'th' : 'td';
                return (
                  <Cell
                    key={data.columns[i]?.label ?? i}
                    scope={i === 0 ? 'row' : undefined}
                    className={data.columns[i]?.numeric ? styles.numeric : undefined}
                  >
                    {cell}
                  </Cell>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
