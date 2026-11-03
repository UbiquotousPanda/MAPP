import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import type { RevenueFigure, StageFigure } from './api';
import styles from './DataSourcesArea.module.css';
import { STAGE_WORDS } from '../performance-text';

const TITLE = 'Months behind the projection';

interface Column {
  label: string;
  cell: (month: string) => string;
}

/** The plan year month by month, as the API splits it at today: actual behind, projected ahead. */
export function ProjectionMonths({
  stages,
  revenue,
}: {
  stages: StageFigure[];
  revenue: RevenueFigure;
}) {
  const formatters = useFormatters();
  const series = stages.filter((stage) => stage.months.length > 0);
  const months = series[0]?.months ?? revenue.months;
  if (months.length === 0) {
    return null;
  }
  const columns: Column[] = series.flatMap((stage) => {
    const at = (month: string) => stage.months.find((m) => m.month === month);
    const shown = (value: number | null | undefined) =>
      value === null || value === undefined ? '—' : formatWhole(value);
    const name = STAGE_WORDS[stage.stage] ?? stage.stage;
    return [
      { label: `${name} actual`, cell: (month) => shown(at(month)?.actual) },
      { label: `${name} projected`, cell: (month) => shown(at(month)?.projected) },
    ];
  });
  if (revenue.months.length > 0) {
    const at = (month: string) => revenue.months.find((m) => m.month === month);
    columns.push(
      { label: 'Revenue actual', cell: (month) => formatters.money(at(month)?.actual) },
      {
        label: 'Revenue projected',
        cell: (month) => formatters.money(at(month)?.projected),
      },
    );
  }
  return (
    <details>
      <summary className={styles.summary}>{TITLE}</summary>
      <div className={styles.scroll}>
        <table className={styles.table} aria-label={TITLE}>
          <thead>
            <tr>
              <th scope="col">Month</th>
              {columns.map((column) => (
                <th key={column.label} scope="col" className={styles.numeric}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <th scope="row">
                  {formatters.month(m.month)}
                  {m.inProgress && ' · this month'}
                </th>
                {columns.map((column) => (
                  <td key={column.label} className={styles.numeric}>
                    {column.cell(m.month)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
