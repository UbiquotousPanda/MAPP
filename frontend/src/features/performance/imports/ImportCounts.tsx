import { formatWhole } from '@/format/decimal';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import dataTable from '@/ui/Table/Table.module.css';
import type { PerformanceCounts, PerformanceImport } from './api';
import { measureWord, OUTCOMES } from './imports-text';

/** The five outcomes as the API counted them, and the same five per measure under them. */
export function ImportCounts({ load }: { load: PerformanceImport }) {
  return (
    <div className={dataTable.scroll}>
      <table className={dataTable.table}>
        <caption className="visually-hidden">Rows read and what became of them</caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col" className={dataTable.numeric}>
              Rows read
            </th>
            {OUTCOMES.map(({ key, label, tip }) => (
              <th key={key} scope="col" className={dataTable.numeric}>
                {label} <InfoTip label={label} text={tip} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <CountsRow label="All rows" counts={load.counts} />
          {load.breakdown.map((group) => {
            const label = measureWord(group.stage, group.webMetric);
            return <CountsRow key={label} label={label} counts={group.counts} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

function CountsRow({ label, counts }: { label: string; counts: PerformanceCounts }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className={dataTable.numeric}>{formatWhole(counts.read)}</td>
      {OUTCOMES.map(({ key }) => (
        <td key={key} className={dataTable.numeric}>
          {formatWhole(counts[key])}
        </td>
      ))}
    </tr>
  );
}
