import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import type { PlanListFilters } from './list-preferences';

const CHOICES: { value: PlanListFilters['bcpir']; label: string }[] = [
  { value: 'include', label: 'All plans' },
  { value: 'only', label: 'Only BCPIR plans' },
  { value: 'exclude', label: 'No BCPIR plans' },
];

interface BcpirChoiceProps {
  /** The radio group's name, unique on the page. */
  name: string;
  value: PlanListFilters['bcpir'];
  onChange: (next: Partial<PlanListFilters>) => void;
}

/** The "BCPIR plans" choice of the Plans list's Filters menu. */
export function BcpirChoice({ name, value, onChange }: BcpirChoiceProps) {
  return (
    <RadioGroup
      label="BCPIR plans"
      name={name}
      options={CHOICES}
      value={value}
      onChange={(bcpir) => onChange({ bcpir })}
    />
  );
}
