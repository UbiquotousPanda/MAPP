import { cx } from '@/ui/cx';
import { Select } from '@/ui/Select/Select';
import type { ReportAddress } from '../shared';
import { useOwnParam } from '../shared/useOwnParam';
import type { PlanDetailsAttributeRow, PlanDetailsReport as Report } from './api';
import { ValueWidget } from './ValueWidget';
import styles from './PlanDetails.module.css';

const ORDERS = [
  { value: '', label: 'Worst filled first' },
  { value: 'settings', label: 'Settings order' },
];

function filledIn(row: PlanDetailsAttributeRow): number | null {
  return row.widgets.find((w) => w.measure === 'filledIn')?.filledInPercent ?? null;
}

/** The API's per cent ordered lowest first; an attribute without one goes last, in Settings order. */
function worstFirst(rows: PlanDetailsAttributeRow[]): PlanDetailsAttributeRow[] {
  return [...rows].sort((a, b) => (filledIn(a) ?? 101) - (filledIn(b) ?? 101));
}

/** One Shell attribute at a time: the list of attributes beside the chosen one's widgets, kept in the address. */
export function AttributeWidgets({ report, address }: { report: Report; address: ReportAddress }) {
  const [chosen, choose] = useOwnParam('attribute');
  const [order, setOrder] = useOwnParam('attrOrder');
  const rows = order === 'settings' ? report.attributes : worstFirst(report.attributes);
  const row = report.attributes.find((r) => r.attributeId === chosen) ?? rows[0];
  if (!row) {
    return null;
  }
  return (
    <div className={styles.attributes}>
      <nav className={styles.attrNav} aria-label="Shell attributes">
        <div className={styles.attrNavHead}>
          <h2 className={styles.attrNavTitle}>Shell attributes · {rows.length}</h2>
          <Select label="Order" hideLabel value={order} options={ORDERS} onChange={setOrder} />
        </div>
        <ul>
          {rows.map((r) => (
            <li key={r.attributeId}>
              <button
                type="button"
                className={cx(styles.attrItem, r === row && styles.attrCurrent)}
                aria-current={r === row || undefined}
                onClick={() => choose(r.attributeId)}
              >
                <span>{r.label}</span>{' '}
                {filledIn(r) !== null && (
                  <span className={styles.attrFilled}>{filledIn(r)} % filled in</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <section aria-label={row.label} className={cx(styles.widgets, styles.attrWidgets)}>
        {row.widgets.map((widget) => (
          <ValueWidget
            key={widget.key}
            widget={widget}
            level={report.show}
            address={address}
            attributeId={row.attributeId}
            currency={report.currency}
          />
        ))}
      </section>
    </div>
  );
}
