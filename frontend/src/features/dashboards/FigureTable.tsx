import type { ReactNode } from 'react';
import { useFormatters } from '@/format/useFormatters';
import dataTable from '@/ui/Table/Table.module.css';
import { cx } from '@/ui/cx';
import type { DashboardFigures } from './api';
import styles from './Dashboards.module.css';

export interface FigureRow {
  key: string;
  name: ReactNode;
  extra?: ReactNode[];
  figures: DashboardFigures;
  chosen?: boolean;
}

interface FigureTableProps {
  caption: string;
  nameTitle: string;
  extraTitles?: string[];
  rows: FigureRow[];
}

const FIGURE_TITLES = ['Budget', 'Planned cost', 'Committed', 'Actual', 'Left to plan'];

export function FigureTable({ caption, nameTitle, extraTitles = [], rows }: FigureTableProps) {
  const { money } = useFormatters();
  return (
    <div className={styles.scroll}>
      <table className={cx(dataTable.table, styles.table)}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{nameTitle}</th>
            {extraTitles.map((title) => (
              <th key={title} scope="col">
                {title}
              </th>
            ))}
            {FIGURE_TITLES.map((title) => (
              <th key={title} scope="col" className={dataTable.numeric}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.chosen ? styles.chosen : undefined}>
              <th scope="row">{row.name}</th>
              {(row.extra ?? []).map((cell, index) => (
                <td key={extraTitles[index] ?? index}>{cell}</td>
              ))}
              <td className={dataTable.numeric}>{money(row.figures.budget)}</td>
              <td className={dataTable.numeric}>
                {money(row.figures.plannedCost)}
                {row.figures.overBudget && <span className={styles.problem}> · Over budget</span>}
              </td>
              <td className={dataTable.numeric}>{money(row.figures.committed)}</td>
              <td className={dataTable.numeric}>{money(row.figures.actual)}</td>
              <td className={dataTable.numeric}>{money(row.figures.leftToPlan)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
