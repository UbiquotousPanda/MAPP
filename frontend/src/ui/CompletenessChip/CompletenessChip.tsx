import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { cx } from '../cx';
import { Popover } from '../Popover/Popover';
import styles from './CompletenessChip.module.css';

export interface MissingField {
  id: string;
  label: string;
}

export interface ItemBelow {
  id: string;
  label: string;
  href: string;
}

export interface CompletenessChipProps {
  missing: MissingField[];
  onSelectField?: (id: string) => void;
  /** Records below that need attention (D-199): a list with links, or a count. */
  itemsBelow?: number | ItemBelow[];
  onItemsBelowSelect?: () => void;
  itemsBelowText?: (count: number) => string;
}

function itemsBelowSummary(count: number): string {
  return count === 1 ? '1 item below needs attention' : `${count} items below need attention`;
}

/** "All filled in", or "3 fields needed" with a list that leads to each field (design system §5). */
export function CompletenessChip({
  missing,
  onSelectField,
  itemsBelow,
  onItemsBelowSelect,
  itemsBelowText = itemsBelowSummary,
}: CompletenessChipProps) {
  const below = typeof itemsBelow === 'number' ? itemsBelow : (itemsBelow?.length ?? 0);
  if (below === 0) {
    return <FieldsChip missing={missing} onSelectField={onSelectField} />;
  }
  return (
    <span className={styles.chips}>
      <FieldsChip missing={missing} onSelectField={onSelectField} />
      <ItemsBelowChip
        itemsBelow={itemsBelow ?? 0}
        onSelect={onItemsBelowSelect}
        summary={itemsBelowText(below)}
      />
    </span>
  );
}

function FieldsChip({
  missing,
  onSelectField,
}: Pick<CompletenessChipProps, 'missing' | 'onSelectField'>) {
  const [open, setOpen] = useState(false);
  const chosenField = useRef<string | null>(null);

  if (missing.length === 0) {
    return <span className={cx(styles.chip, styles.complete)}>All filled in</span>;
  }

  const summary = missing.length === 1 ? '1 field needed' : `${missing.length} fields needed`;

  function choose(id: string) {
    chosenField.current = id;
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={cx(styles.chip, styles.incomplete)}>
        {summary}
        <ChevronDown />
      </Popover.Trigger>
      <Popover.Content
        className={styles.list}
        padding="sm"
        aria-label={summary}
        onCloseAutoFocus={(event) => {
          // After a choice the focus goes to that field, not back to the chip.
          const id = chosenField.current;
          chosenField.current = null;
          if (id && onSelectField) {
            event.preventDefault();
            onSelectField(id);
          }
        }}
      >
        <ul>
          {missing.map((field) => (
            <li key={field.id}>
              {onSelectField ? (
                <button type="button" className={styles.field} onClick={() => choose(field.id)}>
                  {field.label}
                </button>
              ) : (
                <span className={styles.field}>{field.label}</span>
              )}
            </li>
          ))}
        </ul>
      </Popover.Content>
    </Popover.Root>
  );
}

function ItemsBelowChip({
  itemsBelow,
  onSelect,
  summary,
}: {
  itemsBelow: number | ItemBelow[];
  onSelect?: () => void;
  summary: string;
}) {
  if (typeof itemsBelow === 'number') {
    return onSelect ? (
      <button type="button" className={cx(styles.chip, styles.incomplete)} onClick={onSelect}>
        {summary}
      </button>
    ) : (
      <span className={cx(styles.chip, styles.attention)}>{summary}</span>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger className={cx(styles.chip, styles.incomplete)}>
        {summary}
        <ChevronDown />
      </Popover.Trigger>
      <Popover.Content className={styles.list} padding="sm" aria-label={summary}>
        <ul>
          {itemsBelow.map((item) => (
            <li key={item.id}>
              <Link to={item.href} className={styles.field}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Popover.Content>
    </Popover.Root>
  );
}
