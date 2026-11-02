import { Link } from 'react-router';
import { useFormatters } from '@/format/useFormatters';
import type { VendorData } from './api';
import { lineText, NUMERIC, requestText, vendorText } from './cells';
import type { Format } from './cells';
import type { ColumnKey } from './schemas';
import styles from './PurchaseRequests.module.css';

export interface GridRowsProps {
  vendor: VendorData;
  columns: ColumnKey[];
  open: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

function Toggle(props: { open: boolean; name: string; onClick: () => void }) {
  return (
    <td>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={props.open}
        aria-label={`${props.open ? 'Close' : 'Open'} ${props.name}`}
        onClick={props.onClick}
      >
        {props.open ? '▾' : '▸'}
      </button>
    </td>
  );
}

function cellClass(column: ColumnKey, level: string): string | undefined {
  const parts = [NUMERIC.includes(column) && styles.numeric, column === 'name' && level].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/** One vendor with, when opened, its purchase requests, and under each opened request its lines. */
export function GridRows({ vendor, columns, open, onToggle }: GridRowsProps) {
  const { money, date } = useFormatters();
  const format: Format = { money, date };
  const vendorKey = `v:${vendor.vendor}`;
  return (
    <>
      <tr className={styles.vendorRow}>
        <Toggle
          open={open.has(vendorKey)}
          name={vendor.label}
          onClick={() => onToggle(vendorKey)}
        />
        {columns.map((c) => (
          <td key={c} className={cellClass(c, '')}>
            {vendorText(vendor, c, format)}
          </td>
        ))}
      </tr>
      {open.has(vendorKey) &&
        vendor.requests.map((r) => {
          const requestKey = `r:${r.id}`;
          return (
            <RequestRows
              key={r.id}
              request={r}
              columns={columns}
              format={format}
              open={open.has(requestKey)}
              onToggle={() => onToggle(requestKey)}
            />
          );
        })}
    </>
  );
}

function RequestRows(props: {
  request: VendorData['requests'][number];
  columns: ColumnKey[];
  format: Format;
  open: boolean;
  onToggle: () => void;
}) {
  const { request: r, columns, format, open } = props;
  return (
    <>
      <tr>
        <Toggle open={open} name={r.name} onClick={props.onToggle} />
        {columns.map((c) => (
          <td key={c} className={cellClass(c, styles.level1 ?? '')}>
            {c === 'name' ? (
              <Link to={`/purchase-requests/${r.id}`}>{r.name}</Link>
            ) : (
              requestText(r, c, format)
            )}
          </td>
        ))}
      </tr>
      {open &&
        r.lines.map((l) => (
          <tr key={l.id}>
            <td />
            {columns.map((c) => (
              <td key={c} className={cellClass(c, styles.level2 ?? '')}>
                {lineText(l, c, format)}
              </td>
            ))}
          </tr>
        ))}
    </>
  );
}
