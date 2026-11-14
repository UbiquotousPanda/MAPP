import type { ComponentProps } from 'react';
import { cx } from '../cx';
import { InfoTip } from '../InfoTip/InfoTip';
import { InlineError } from '../InlineError/InlineError';
import { LockedNote } from '../LockedNote/LockedNote';
import styles from './CheckboxField.module.css';

export interface CheckboxFieldProps {
  label: string;
  /** The field's name and the check box's id, so FormErrorSummary can link to it. */
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  tip?: string;
  error?: string;
  /** Locks the check box and says why under it ("Ongoing can't be undone after saving."). */
  disabledReason?: string;
}

export function CheckboxField({
  label,
  name,
  checked,
  onChange,
  hint,
  tip,
  error,
  disabledReason,
}: CheckboxFieldProps) {
  const hintId = `${name}-hint`;
  const reasonId = `${name}-reason`;
  const errorId = `${name}-error`;
  const describedBy =
    [hint && hintId, disabledReason && reasonId, error && errorId].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={styles.field}>
      <div className={styles.row}>
        <Checkbox
          id={name}
          name={name}
          checked={checked}
          disabled={Boolean(disabledReason)}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <label htmlFor={name} className={styles.label}>
          {label}
        </label>
        {tip && <InfoTip label={label} text={tip} />}
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {disabledReason && (
        <div className={styles.indented}>
          <LockedNote id={reasonId}>{disabledReason}</LockedNote>
        </div>
      )}
      {error && (
        <div className={styles.indented}>
          <InlineError id={errorId} quiet>
            {error}
          </InlineError>
        </div>
      )}
    </div>
  );
}

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  indeterminate?: boolean;
}

/** The bare 20 px check box, for a row of a list or a table; it needs a label or an aria-label. */
export function Checkbox({ indeterminate = false, className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      ref={(box) => {
        if (box) box.indeterminate = indeterminate;
      }}
      className={cx(styles.box, className)}
      {...props}
    />
  );
}
