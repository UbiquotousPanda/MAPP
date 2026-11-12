import { Check, ChevronDown } from 'lucide-react';
import { Select as Radix } from 'radix-ui';
import { useId } from 'react';
import { cx } from '../cx';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Shown before the control, or only to screen readers with hideLabel. */
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hideLabel?: boolean;
  /** A consequence of changing it, said at the top of the open menu and to screen readers. */
  note?: string;
}

// Radix keeps "" for "nothing chosen", so an option whose value is "" (All) travels as this instead.
const EMPTY = '\u0000';
const toItem = (value: string) => (value === '' ? EMPTY : value);
const fromItem = (value: string) => (value === EMPTY ? '' : value);

/** A compact single choice with the app's own menu: label beside it, 32 px high, ticked choice. */
export function Select({ label, value, options, onChange, hideLabel, note }: SelectProps) {
  const labelId = useId();
  const noteId = useId();
  return (
    <div className={styles.field}>
      <span id={labelId} className={cx(styles.label, hideLabel && 'visually-hidden')}>
        {label}
      </span>
      <Radix.Root value={toItem(value)} onValueChange={(next) => onChange(fromItem(next))}>
        <Radix.Trigger
          className={styles.trigger}
          aria-labelledby={labelId}
          aria-describedby={note ? noteId : undefined}
        >
          <Radix.Value />
          <Radix.Icon className={styles.icon}>
            <ChevronDown aria-hidden="true" />
          </Radix.Icon>
        </Radix.Trigger>
        <Radix.Portal>
          <Radix.Content className={styles.content} position="popper" sideOffset={4}>
            <Radix.Viewport className={styles.viewport}>
              {note && <p className={styles.note}>{note}</p>}
              {options.map((option) => (
                <Radix.Item key={option.value} value={toItem(option.value)} className={styles.item}>
                  <Radix.ItemText>{option.label}</Radix.ItemText>
                  <Radix.ItemIndicator className={styles.tick}>
                    <Check aria-hidden="true" />
                  </Radix.ItemIndicator>
                </Radix.Item>
              ))}
            </Radix.Viewport>
          </Radix.Content>
        </Radix.Portal>
      </Radix.Root>
      {note && (
        <span id={noteId} className="visually-hidden">
          {note}
        </span>
      )}
    </div>
  );
}
