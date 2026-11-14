import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { localDate } from '@/format/intl';
import { Button } from '../Button/Button';
import { cx } from '../cx';
import inputs from '../FieldShell/inputs.module.css';
import { DatePicker } from '../DatePicker/DatePicker';
import { Popover } from '../Popover/Popover';
import styles from './DateField.module.css';
import type { TypedDate } from './useTypedDate';

export interface DateControlProps {
  id: string;
  /** Names the calendar button: "Choose start date". */
  label: string;
  typed: TypedDate;
  name?: string;
  min?: string;
  max?: string;
  invalid?: boolean;
  describedBy?: string;
  required?: true;
  disabled?: boolean;
  compact?: boolean;
}

/** A date typed in the person's format, or chosen on the calendar its button opens (§5.5). */
export function DateControl(props: DateControlProps) {
  const { id, label, typed, name, min, max, disabled, compact } = props;
  const [open, setOpen] = useState(false);
  const choose = `Choose ${/date$/i.test(label) ? label.toLowerCase() : `${label.toLowerCase()} date`}`;
  const close = (day: string) => {
    typed.choose(day);
    setOpen(false);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className={cx(styles.control, compact && styles.compact)}>
          <input
            id={id}
            type="text"
            autoComplete="off"
            value={typed.text}
            disabled={disabled}
            onChange={(event) => typed.type(event.target.value)}
            onBlur={typed.settle}
            aria-invalid={props.invalid || typed.problem ? true : undefined}
            aria-describedby={props.describedBy}
            aria-required={props.required}
            className={cx(
              inputs.input,
              styles.input,
              (props.invalid || typed.problem) && inputs.invalid,
            )}
          />
          {name !== undefined && <input type="hidden" name={name} value={typed.value} />}
          <Popover.Trigger asChild>
            <Button
              size="sm"
              variant="tertiary"
              icon={<CalendarDays />}
              aria-label={choose}
              disabled={disabled}
              className={styles.calendar}
            />
          </Popover.Trigger>
        </div>
      </Popover.Anchor>
      <Popover.Content
        width="md"
        aria-label={choose}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DatePicker
          value={typed.value}
          today={localDate(new Date())}
          min={min}
          max={max}
          onChoose={close}
          onClear={() => close('')}
        />
      </Popover.Content>
    </Popover.Root>
  );
}
