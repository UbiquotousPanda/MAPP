import { useFormatters } from '@/format/useFormatters';
import { Select } from '@/ui/Select/Select';
import { ReportWidget } from '../shared';
import type { ReportAddress, ReportTableData } from '../shared';
import { useSummaryLeague } from './api';
import type { SummaryLeague } from './api';
import { TABLES } from './schemas';
import type { LeagueTableKey, SummaryParams } from './schemas';
import { LEAGUE_COLUMN, LEAGUE_TITLE } from './words';
import styles from './Summary.module.css';

type Value = SummaryLeague['total'];
type Covers = { plans: number; of: number };

const TIP =
  'The five highest values, then the total over every value. A record with several values is shared equally between them; one with none counts under Not filled in.';

export interface LeagueSectionProps {
  address: ReportAddress;
  params: SummaryParams;
  onSegment: (segment: string) => void;
  covers?: Covers;
}

/** The four league tables under one heading, with one Segment choice for all of them. */
export function LeagueSection({ address, params, onSegment, covers }: LeagueSectionProps) {
  const { category } = params;
  const lead = useSummaryLeague('revenue', address, {
    ...(category && { category }),
    ...(params.revenueBy && { segment: params.revenueBy }),
  });
  const current = lead.data?.segment;
  return (
    <section className={styles.section} aria-labelledby="summary-leagues">
      <div className={styles.sectionHead}>
        <h2 id="summary-leagues" className={styles.heading}>
          {current ? `Top five by ${current.label}` : 'Top five'}
        </h2>
        {lead.data && lead.data.segments.length > 0 && (
          <Select
            label="Segment"
            value={current?.id ?? ''}
            options={lead.data.segments.map((s) => ({ value: s.id, label: s.label }))}
            onChange={onSegment}
          />
        )}
      </div>
      <div className={styles.leagues}>
        {TABLES.map(({ table, param }) => (
          <LeagueTable
            key={table}
            table={table}
            address={address}
            category={category}
            segment={params[param]}
            covers={covers}
          />
        ))}
      </div>
    </section>
  );
}

interface LeagueTableProps {
  table: LeagueTableKey;
  address: ReportAddress;
  category: string;
  segment: string;
  covers?: Covers;
}

/** One league table: the five highest values of its segment, then the total over all. */
function LeagueTable({ table, address, category, segment, covers }: LeagueTableProps) {
  const { money } = useFormatters();
  const league = useSummaryLeague(table, address, {
    ...(category && { category }),
    ...(segment && { segment }),
  });
  const data = league.data;
  const shown = (v: Value) => (v === null ? '—' : typeof v === 'number' ? `${v}%` : money(v));
  const rows: ReportTableData = {
    columns: [
      { label: data?.segment?.label ?? 'Segment' },
      { label: LEAGUE_COLUMN[table], numeric: true },
    ],
    rows: (data?.rows ?? []).map((r) => ({ key: r.key, cells: [r.name, shown(r.value)] })),
    total: data && ['Total', shown(data.total)],
  };
  const financial = table === 'cost' || table === 'roi';
  const covered =
    financial && covers && covers.plans < covers.of
      ? `Covers ${covers.plans} of ${covers.of} plans`
      : undefined;
  const noRoi = data?.roi && data.total === null && data.rows.every((r) => r.value === null);
  return (
    <ReportWidget
      report="summary"
      widget={`league${table.charAt(0).toUpperCase()}${table.slice(1)}`}
      title={LEAGUE_TITLE[table]}
      tip={[
        TIP,
        data?.roi && `Attribution: ${data.roi.model}, on ${data.roi.basis} cost.`,
        data?.reason,
      ]
        .filter(Boolean)
        .join(' ')}
      note={covered}
      loading={!data && !league.isError}
      failed={league.isError}
      onRetry={() => void league.refetch()}
      table={rows}
      chart={
        data &&
        (noRoi ? (
          <p className={styles.muted}>
            {data.reason ?? 'No attributed revenue yet'}, so ROI can’t be worked out
          </p>
        ) : (
          <Bars data={data} shown={shown} />
        ))
      }
    />
  );
}

function Bars({ data, shown }: { data: SummaryLeague; shown: (v: Value) => string }) {
  const top = Math.max(0, ...data.rows.map((r) => numberOf(r.value)));
  return (
    <ol className={styles.league}>
      {data.rows.map((r) => (
        <li key={r.key}>
          <span>{r.name}</span>
          {r.value !== null && (
            <span className={styles.leagueTrack} aria-hidden="true">
              <span className={styles.leagueBar} style={{ width: `${share(r.value, top)}%` }} />
            </span>
          )}
          <span className={styles.leagueValue}>{shown(r.value)}</span>
        </li>
      ))}
      <li className={styles.leagueTotal}>
        <span>Total</span>
        <span className={styles.leagueValue}>{shown(data.total)}</span>
      </li>
    </ol>
  );
}

function numberOf(value: Value): number {
  return value === null ? 0 : typeof value === 'number' ? value : Number(value.amount);
}

// Each bar is its value against the largest in the list; a negative ROI shows no bar.
function share(value: Value, top: number): number {
  return top > 0 ? Math.max(0, (numberOf(value) / top) * 100) : 0;
}
