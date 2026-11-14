import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import type { PlanCopyOptions } from '../api';

export interface YearChoiceProps {
  options: PlanCopyOptions;
  year: number;
  error?: string;
  onChange: (year: number) => void;
}

/** The copy's year: the same or the next one, which is unavailable with the reason. */
export function YearChoice({ options, year, error, onChange }: YearChoiceProps) {
  const nextYear = options.nextYear;
  return (
    <RadioGroup
      label="Year"
      name="year"
      options={[
        { value: options.sameYear, label: `Same year (${options.sameYear})` },
        {
          value: nextYear.year,
          label: `Next year (${nextYear.year})`,
          disabledReason: nextYear.available ? undefined : nextYear.reason,
        },
      ]}
      value={year}
      onChange={onChange}
      note={year === nextYear.year ? 'Every date moves one year later.' : undefined}
      error={error}
    />
  );
}
