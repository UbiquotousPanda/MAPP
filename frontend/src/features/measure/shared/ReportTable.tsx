import dataTable from '@/ui/Table/Table.module.css';
import { TotalLabel } from '@/ui/Table/TotalLabel';

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
  /** The totals row's figures, one per column after the first; the first cell reads "Total". */
  total?: string[];
  /** A second line under "Total": "41 requests, 77 lines". */
  totalCount?: string;
}

/** A widget's table view: every value the chart draws, with the same labels, then the totals. */
export function ReportTable({ title, data }: { title: string; data: ReportTableData }) {
  return (
    <div className={dataTable.scroll}>
      <table className={dataTable.table}>
        <caption className="visually-hidden">{title}</caption>
        <thead>
          <tr>
            {data.columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={column.numeric ? dataTable.numeric : undefined}
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
                  className={data.columns[i]?.numeric ? dataTable.numeric : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {data.total && (
          <tfoot>
            <tr className={dataTable.total}>
              <th scope="row">
                <TotalLabel count={data.totalCount} />
              </th>
              {data.total.map((cell, i) => (
                <td
                  key={data.columns[i + 1]?.label ?? i}
                  className={data.columns[i + 1]?.numeric ? dataTable.numeric : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
