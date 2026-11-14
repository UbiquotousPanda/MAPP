import { Check, ChevronDown } from 'lucide-react';
import { Select as Radix } from 'radix-ui';
import { Fragment, useId } from 'react';
import type { KeyboardEvent } from 'react';
import { cx } from '../cx';
import inputs from '../FieldShell/inputs.module.css';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  /** Lists the option under this heading; options without one come where they first appear. */
  group?: string;
}

export interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hideLabel?: boolean;
  /** A consequence of changing it, said at the top of the open menu and to screen readers. */
  note?: string;
  /** Shown on the closed control instead of the chosen option's label ("USD" for "USD – US dollar"). */
  valueText?: string;
}

export interface SelectControlProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  size?: 'sm' | 'md';
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  note?: string;
  valueText?: string;
}

// Radix keeps "" for "nothing chosen", so an option whose value is "" (All) travels as this instead.
const EMPTY = '\u0000';
const toItem = (value: string) => (value === '' ? EMPTY : value);
const fromItem = (value: string) => (value === EMPTY ? '' : value);

/** A compact single choice with the app's own menu: label beside it, 32 px high, ticked choice. */
export function Select(props: SelectProps) {
  const { label, value, options, onChange, hideLabel, note, valueText } = props;
  const labelId = useId();
  const noteId = useId();
  return (
    <div className={styles.field}>
      <span id={labelId} className={cx(styles.label, hideLabel && 'visually-hidden')}>
        {label}
      </span>
      <SelectControl
        {...{ value, options, onChange, note, valueText }}
        labelledBy={labelId}
        describedBy={note ? noteId : undefined}
      />
      {note && (
        <span id={noteId} className="visually-hidden">
          {note}
        </span>
      )}
    </div>
  );
}

/** The control and its menu alone, for a frame that draws its own label (ChoiceField). */
export function SelectControl(props: SelectControlProps) {
  const { value, options, onChange, size = 'sm', note, valueText } = props;
  return (
    <Radix.Root
      value={toItem(value)}
      onValueChange={(next) => onChange(fromItem(next))}
      name={props.name}
      required={props.required}
      disabled={props.disabled}
    >
      <Radix.Trigger
        id={props.id}
        className={cx(styles.trigger, size === 'md' && cx(inputs.input, styles.md))}
        aria-labelledby={props.labelledBy}
        aria-describedby={props.describedBy}
        aria-invalid={props.invalid || undefined}
        aria-required={props.required || undefined}
        onKeyDown={submitOnEnter}
      >
        <Radix.Value>{valueText}</Radix.Value>
        <Radix.Icon className={styles.icon}>
          <ChevronDown aria-hidden="true" />
        </Radix.Icon>
      </Radix.Trigger>
      <Radix.Portal>
        <Radix.Content className={styles.content} position="popper" sideOffset={4}>
          <Radix.Viewport className={styles.viewport}>
            {note && <p className={styles.note}>{note}</p>}
            <Items options={options} />
          </Radix.Viewport>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

// Enter saves the form from a closed choice too, as it does from a text field; arrows and Space open it.
function submitOnEnter(event: KeyboardEvent<HTMLButtonElement>) {
  const form = event.currentTarget.form;
  if (event.key === 'Enter' && form) {
    event.preventDefault();
    form.requestSubmit();
  }
}

function Items({ options }: { options: SelectOption[] }) {
  const groups = [...new Set(options.map((option) => option.group))];
  return groups.map((group) => {
    const items = options
      .filter((option) => option.group === group)
      .map((option) => <Item key={option.value} option={option} />);
    return group === undefined ? (
      <Fragment key="">{items}</Fragment>
    ) : (
      <Radix.Group key={group} className={styles.group}>
        <Radix.Label className={styles.groupLabel}>{group}</Radix.Label>
        {items}
      </Radix.Group>
    );
  });
}

function Item({ option }: { option: SelectOption }) {
  return (
    <Radix.Item value={toItem(option.value)} className={styles.item}>
      <Radix.ItemText>{option.label}</Radix.ItemText>
      <Radix.ItemIndicator className={styles.tick}>
        <Check aria-hidden="true" />
      </Radix.ItemIndicator>
    </Radix.Item>
  );
}
