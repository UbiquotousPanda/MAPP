import { Button } from '@/ui/Button/Button';
import { COLUMN_KEYS } from './schemas';
import type { ColumnKey } from './schemas';
import { COLUMN_WORDS } from './words';
import styles from './PurchaseRequests.module.css';

export interface ColumnChooserProps {
  columns: ColumnKey[];
  onChange: (columns: ColumnKey[]) => void;
}

function moved(columns: ColumnKey[], index: number, by: number): ColumnKey[] {
  const next = [...columns];
  const target = index + by;
  const [item] = next.splice(index, 1);
  if (item === undefined || target < 0 || target > next.length) {
    return columns;
  }
  next.splice(target, 0, item);
  return next;
}

/** Shows, hides and reorders the grid's columns; the choice goes to the page address. */
export function ColumnChooser({ columns, onChange }: ColumnChooserProps) {
  const hidden = COLUMN_KEYS.filter((k) => !columns.includes(k));
  return (
    <details className={styles.chooser}>
      <summary>Columns</summary>
      <ul className={styles.chooserList}>
        {columns.map((key, i) => (
          <li key={key}>
            <label>
              <input
                type="checkbox"
                checked
                disabled={columns.length === 1}
                onChange={() => onChange(columns.filter((c) => c !== key))}
              />{' '}
              {COLUMN_WORDS[key]}
            </label>
            <Button
              type="button"
              size="sm"
              variant="tertiary"
              disabled={i === 0}
              aria-label={`Move ${COLUMN_WORDS[key]} left`}
              onClick={() => onChange(moved(columns, i, -1))}
            >
              ←
            </Button>
            <Button
              type="button"
              size="sm"
              variant="tertiary"
              disabled={i === columns.length - 1}
              aria-label={`Move ${COLUMN_WORDS[key]} right`}
              onClick={() => onChange(moved(columns, i, 1))}
            >
              →
            </Button>
          </li>
        ))}
        {hidden.map((key) => (
          <li key={key}>
            <label>
              <input type="checkbox" checked={false} onChange={() => onChange([...columns, key])} />{' '}
              {COLUMN_WORDS[key]}
            </label>
          </li>
        ))}
        <li>
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            onClick={() => onChange([...COLUMN_KEYS])}
          >
            Reset columns
          </Button>
        </li>
      </ul>
    </details>
  );
}
