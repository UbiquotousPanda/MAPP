import { useId } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../cx';
import { FieldShell } from '../FieldShell/FieldShell';
import type { FieldFrameProps } from '../FieldShell/FieldShell';
import { InlineError } from '../InlineError/InlineError';
import selectStyles from '../Select/Select.module.css';
import styles from './DateField.module.css';
import { DateControl } from './DateInput';
import { useTypedDate } from './useTypedDate';

export interface DateFieldProps extends FieldFrameProps {
  /** The input's name and id, so FormErrorSummary can link to it; filters may leave it out. */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  note?: ReactNode;
  /** In a filter bar: the label beside a 32 px control, like `Select`. */
  compact?: boolean;
}

/** One calendar date, typed or chosen on our own calendar, in a form field's frame or a filter bar. */
export function DateField(props: DateFieldProps) {
  const { name, value, onChange, min, max, note, compact, ...frame } = props;
  const generated = useId();
  const id = name ?? generated;
  const typed = useTypedDate(value, onChange);
  const error = typed.problem ?? props.error;
  const control = (describedBy: string | undefined, required?: true) => (
    <DateControl
      {...{ id, name, typed, min, max, describedBy, required, compact }}
      label={frame.label}
      invalid={Boolean(error)}
    />
  );

  if (!compact) {
    return (
      <FieldShell id={id} note={note} {...frame} error={error}>
        {control}
      </FieldShell>
    );
  }
  const errorId = `${id}-error`;
  return (
    <div className={styles.compactField}>
      <div className={selectStyles.field}>
        <label
          htmlFor={id}
          className={cx(selectStyles.label, frame.labelHidden && 'visually-hidden')}
        >
          {frame.label}
        </label>
        {control(error ? errorId : undefined)}
      </div>
      {error && <InlineError id={errorId}>{error}</InlineError>}
    </div>
  );
}
