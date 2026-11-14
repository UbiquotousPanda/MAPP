import type { KeyboardEvent } from 'react';
import { cx } from '../cx';
import { FieldShell } from '../FieldShell/FieldShell';
import type { FieldFrameProps } from '../FieldShell/FieldShell';
import inputs from '../FieldShell/inputs.module.css';

const STEP_KEYS: Partial<Record<string, number>> = { ArrowUp: 1, ArrowDown: -1 };

export interface NumberFieldProps extends FieldFrameProps {
  name: string;
  /** NaN while the field is empty. */
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}

/** A whole number within bounds that the arrow keys step through: a count or a size, never money. */
export function NumberField({
  name,
  value,
  onChange,
  min,
  max,
  step = 1,
  error,
  ...frame
}: NumberFieldProps) {
  // The arrows are handled here so that every browser steps the same way and stays within bounds.
  function stepByKey(event: KeyboardEvent<HTMLInputElement>) {
    const direction = STEP_KEYS[event.key];
    if (direction === undefined) {
      return;
    }
    event.preventDefault();
    const from = Number.isFinite(value) ? value : min;
    onChange(Math.min(max, Math.max(min, from + direction * step)));
  }

  return (
    <FieldShell id={name} error={error} {...frame}>
      {(describedBy, required) => (
        <input
          id={name}
          name={name}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => onChange(event.target.valueAsNumber)}
          onKeyDown={stepByKey}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required}
          className={cx(inputs.input, inputs.numeric, error && inputs.invalid)}
        />
      )}
    </FieldShell>
  );
}
