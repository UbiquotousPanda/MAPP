import { useId } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../cx';
import { FieldShell } from '../FieldShell/FieldShell';
import type { FieldFrameProps } from '../FieldShell/FieldShell';
import inputs from '../FieldShell/inputs.module.css';
import { InlineError } from '../InlineError/InlineError';
import selectStyles from '../Select/Select.module.css';
import styles from './DateField.module.css';

export interface DateFieldProps extends FieldFrameProps {
  /** The input's name and id, so FormErrorSummary can link to it; filters may leave it out. */
  name?: string;
  /** "YYYY-MM-DD", or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  note?: ReactNode;
  /** In a filter bar: the label beside a 32 px control, like `Select`. */
  compact?: boolean;
}

/** One calendar date in the browser's date input, in a form field's frame or a filter bar. */
export function DateField(props: DateFieldProps) {
  const { name, value, onChange, min, max, note, compact, error, ...frame } = props;
  const generated = useId();
  const id = name ?? generated;
  const control = (describedBy: string | undefined, required?: true) => (
    <input
      id={id}
      name={name}
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      aria-required={required}
      className={cx(inputs.input, compact && styles.compact, error && inputs.invalid)}
    />
  );

  if (!compact) {
    return (
      <FieldShell id={id} error={error} note={note} {...frame}>
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
