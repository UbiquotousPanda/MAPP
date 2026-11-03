import { toCents } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { ReportWidget } from '../shared';
import type { ReportAddress, ReportTableData } from '../shared';
import { useSummaryLeague } from './api';
import type { SummaryLeague } from './api';
import type { LeagueTableKey } from './schemas';
import { LEAGUE_TITLE } from './words';
import styles from './Summary.module.css';

type Value = SummaryLeague['total'];

export interface LeagueTableProps {
  table: LeagueTableKey;
  address: ReportAddress;
  category: string;
  segment: string;
  onSegment: (segment: string) => void;
}

/** One league table: the five highest values of its segment, then the total over all (048-C5, C6). */
export function LeagueTable({ table, address, category, segment, onSegment }: LeagueTableProps) {
  const { money } = useFormatters();
  const league = useSummaryLeague(table, address, {
    ...(category && { category }),
    ...(segment && { segment }),
  });
  const data = league.data;
  const shown = (v: Value) => (v === null ? '—' : typeof v === 'number' ? `${v}%` : money(v));
  const title = `Top ${LEAGUE_TITLE[table]} by ${data?.segment?.label ?? 'segment'}`;
  const rows: ReportTableData = {
    columns: [
      { label: data?.segment?.label ?? 'Segment' },
      { label: LEAGUE_TITLE[table], numeric: true },
    ],
    rows: [
      ...(data?.rows ?? []).map((r) => ({ key: r.key, cells: [r.name, shown(r.value)] })),
      ...(data ? [{ key: 'total', cells: ['Total', shown(data.total)] }] : []),
    ],
  };
  const note = data?.roi
    ? `${data.roi.model}, on ${data.roi.basis} cost`
    : (data?.reason ?? undefined);
  return (
    <ReportWidget
      report="summary"
      widget={`league${table.charAt(0).toUpperCase()}${table.slice(1)}`}
      title={title}
      tip="The five highest values, then the total over every value. A record with several values is shared equally between them; one with none counts under Not filled in."
      note={note}
      loading={!data && !league.isError}
      failed={league.isError}
      onRetry={() => void league.refetch()}
      table={rows}
      chart={
        data && (
          <>
            <label className={styles.field}>
              Segment
              <select value={data.segment?.id ?? ''} onChange={(e) => onSegment(e.target.value)}>
                {data.segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <ol className={styles.league}>
              {data.rows.map((r) => (
                <li key={r.key}>
                  <span>{r.name}</span>
                  <Sparkline values={r.trend} />
                  <span className={styles.leagueValue}>{shown(r.value)}</span>
                </li>
              ))}
              <li className={styles.leagueTotal}>
                <span>Total</span>
                <span className={styles.leagueValue}>{shown(data.total)}</span>
              </li>
            </ol>
          </>
        )
      }
    />
  );
}

function Sparkline({ values }: { values: Value[] }) {
  const numbers = values.map((v) => (v && typeof v === 'object' ? Number(toCents(v.amount)) : 0));
  const top = Math.max(...numbers, 1);
  const step = 60 / Math.max(numbers.length - 1, 1);
  const points = numbers.map((n, i) => `${i * step},${18 - (n / top) * 16}`).join(' ');
  return (
    <svg className={styles.sparkline} viewBox="0 0 60 20" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}
