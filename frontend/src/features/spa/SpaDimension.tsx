import { ScrollBox } from '@/ui/ScrollBox/ScrollBox';
import { useFormatters } from '@/format/useFormatters';
import { Card } from '@/ui/Card/Card';
import { Select } from '@/ui/Select/Select';
import dataTable from '@/ui/Table/Table.module.css';
import type { SpaView } from './api';
import { Bar } from './Bar';
import { FigureButton } from './FigureButton';
import type { TraceRequest } from './FigureButton';
import { DIMENSION } from './spa-text';
import styles from './Spa.module.css';

interface SpaDimensionProps {
  view: SpaView;
  onDimension: (key: string) => void;
  onTrace: (request: TraceRequest) => void;
}

/** Planned cost by the dimension the person chooses, largest first (013 FR-018). */
export function SpaDimension({ view, onDimension, onTrace }: SpaDimensionProps) {
  const { money } = useFormatters();
  const breakdown = view.dimension;
  return (
    <Card
      title={DIMENSION.title}
      actions={
        <Select
          label={DIMENSION.choose}
          value={breakdown.key}
          options={view.dimensions.map((dimension) => ({
            value: dimension.key,
            label: dimension.label,
          }))}
          onChange={onDimension}
        />
      }
    >
      {breakdown.countsInEach && <p className={styles.note}>{DIMENSION.countsInEach}</p>}
      <ScrollBox label={`Planned cost by ${breakdown.label}`}>
        <table className={dataTable.table}>
          <caption className="visually-hidden">Planned cost by {breakdown.label}</caption>
          <thead>
            <tr>
              <th scope="col">{breakdown.label}</th>
              <th scope="col" className={dataTable.numeric}>
                Planned cost
              </th>
              <th scope="col">{DIMENSION.share}</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td className={dataTable.numeric}>
                  <FigureButton
                    figure={`${breakdown.label}: ${row.label}`}
                    value={row.amount}
                    trace={row.trace}
                    onTrace={onTrace}
                  />
                </td>
                <td>
                  <div className={styles.barCell}>
                    <span className={styles.shareText}>{row.share}%</span>
                    <Bar length={row.bar} series="share" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={dataTable.total}>
              <th scope="row">Total</th>
              <td className={dataTable.numeric}>{money(breakdown.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </ScrollBox>
    </Card>
  );
}
