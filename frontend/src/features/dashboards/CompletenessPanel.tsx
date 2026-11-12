import { Card } from '@/ui/Card/Card';
import dataTable from '@/ui/Table/Table.module.css';
import { cx } from '@/ui/cx';
import type { DashboardCompleteness } from './api';
import { percentText, word } from './dashboard-text';
import styles from './Dashboards.module.css';

interface CompletenessPanelProps {
  levels: DashboardCompleteness[];
}

export function CompletenessPanel({ levels }: CompletenessPanelProps) {
  return (
    <Card title="Plan details" subtitle="Records with every needed field filled in">
      <table className={cx(dataTable.table, styles.table)}>
        <caption className="visually-hidden">Completeness by level</caption>
        <thead>
          <tr>
            {['Level', 'Records', 'All filled in', 'Share'].map((title, i) => (
              <th key={title} scope="col" className={i > 0 ? dataTable.numeric : undefined}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => (
            <tr key={level.level}>
              <th scope="row">{word(level.level)}</th>
              <td className={dataTable.numeric}>{level.total}</td>
              <td className={dataTable.numeric}>{level.complete}</td>
              <td className={dataTable.numeric}>{percentText(level.percent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
