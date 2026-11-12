import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import type { OverspendMode } from './api';
import type { BudgetCheck } from './overspend-check';
import { MODE_HINTS, MODE_WORDS, MODES, OVERSPEND_LABEL } from './overspend-text';

export interface OverspendFieldProps {
  name: string;
  value: OverspendMode;
  onChange: (mode: OverspendMode) => void;
  /** Why the person may not change it; empty when they may. */
  lockedReason?: string;
  check?: BudgetCheck;
}

/** "If planned cost exceeds the budget": Warn or Refuse, with what saving would do. */
export function OverspendField({
  name,
  value,
  onChange,
  lockedReason,
  check,
}: OverspendFieldProps) {
  return (
    <RadioGroup
      label={OVERSPEND_LABEL}
      name={name}
      layout="row"
      options={MODES.map((mode) => ({
        value: mode,
        label: MODE_WORDS[mode],
        hint: MODE_HINTS[mode],
      }))}
      value={value}
      onChange={onChange}
      disabledReason={lockedReason || undefined}
      note={check?.note ?? undefined}
      error={check?.error ?? undefined}
    />
  );
}
