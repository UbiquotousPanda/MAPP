import { ChevronDown } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ItemBelow, MissingField } from '@/ui/CompletenessChip/CompletenessChip';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import styles from './AttentionChip.module.css';

export interface AttentionChipProps {
  missing: MissingField[];
  onSelectField?: (id: string) => void;
  itemsBelow?: number | ItemBelow[];
  /** With a count of records below: opens the place that lists them. */
  onItemsBelowSelect?: () => void;
  /** Rows: "2 problems", the whole sentence in the tooltip, so the Status column stays narrow. */
  compact?: boolean;
  /** Under a row that already shows the chip: a dot only, so one problem is not on every row. */
  quiet?: boolean;
}

function fieldsNeeded(count: number): string {
  return count === 1 ? '1 field needed' : `${count} fields needed`;
}

function itemsBelowNeedAttention(count: number): string {
  return count === 1 ? '1 item below needs attention' : `${count} items below need attention`;
}

/** One completeness chip (design system §4.1: at most two chips per row); its popover lists every problem. */
export function AttentionChip({
  missing,
  onSelectField,
  itemsBelow = 0,
  onItemsBelowSelect,
  compact = false,
  quiet = false,
}: AttentionChipProps) {
  const [open, setOpen] = useState(false);
  // Runs once the list has closed, so the focus moves to the field instead of back to the chip.
  const chosen = useRef<(() => void) | null>(null);
  const below = typeof itemsBelow === 'number' ? itemsBelow : itemsBelow.length;

  if (missing.length === 0 && below === 0) {
    return <span className={`${styles.chip} ${styles.complete}`}>All filled in</span>;
  }

  const summary =
    missing.length > 0 ? fieldsNeeded(missing.length) : itemsBelowNeedAttention(below);

  function choose(action: () => void) {
    chosen.current = action;
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Trigger
        summary={summary}
        below={missing.length === 0 ? below : 0}
        compact={compact}
        quiet={quiet}
      />
      <Popover.Portal>
        <Popover.Content
          className={styles.list}
          align="start"
          sideOffset={6}
          aria-label={summary}
          onCloseAutoFocus={(event) => {
            const action = chosen.current;
            chosen.current = null;
            if (action) {
              event.preventDefault();
              action();
            }
          }}
        >
          {missing.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupTitle}>{fieldsNeeded(missing.length)}</p>
              <ul>
                {missing.map((field) => (
                  <li key={field.id}>
                    {onSelectField ? (
                      <button
                        type="button"
                        className={styles.item}
                        onClick={() => choose(() => onSelectField(field.id))}
                      >
                        {field.label}
                      </button>
                    ) : (
                      <span className={styles.text}>{field.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {below > 0 && (
            <div className={styles.group}>
              <p className={styles.groupTitle}>{itemsBelowNeedAttention(below)}</p>
              {typeof itemsBelow === 'number' ? (
                onItemsBelowSelect && (
                  <ul>
                    <li>
                      <button
                        type="button"
                        className={styles.item}
                        onClick={() => choose(onItemsBelowSelect)}
                      >
                        Show them
                      </button>
                    </li>
                  </ul>
                )
              ) : (
                <ul>
                  {itemsBelow.map((item) => (
                    <li key={item.id}>
                      <Link to={item.href} className={styles.item} onClick={() => setOpen(false)}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Trigger({
  summary,
  below,
  compact,
  quiet,
}: {
  summary: string;
  below: number;
  compact: boolean;
  quiet: boolean;
}) {
  if (!compact || below === 0) {
    return (
      <Popover.Trigger className={`${styles.chip} ${styles.problem}`}>
        {summary}
        {!compact && <ChevronDown aria-hidden="true" />}
      </Popover.Trigger>
    );
  }
  return (
    <Tooltip content={summary}>
      <Popover.Trigger className={quiet ? styles.dot : `${styles.chip} ${styles.problem}`}>
        {!quiet && (below === 1 ? '1 problem' : `${below} problems`)}
        <span className="visually-hidden">{quiet ? summary : ` — ${summary}`}</span>
      </Popover.Trigger>
    </Tooltip>
  );
}
