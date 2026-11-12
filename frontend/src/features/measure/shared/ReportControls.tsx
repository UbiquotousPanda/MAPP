import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { Select } from '@/ui/Select/Select';
import type { Show } from './report-address';
import { SHOW_WORDS, SHOWS } from './report-text';
import { useReportAddress } from './useReportAddress';

/** Months · Quarters, placed on the widget it changes; it writes the report's address. */
export function PeriodSwitch() {
  const [address, setAddress] = useReportAddress();
  return (
    <SegmentedFilter
      label="Period"
      options={[
        { value: 'month', label: 'Months' },
        { value: 'quarter', label: 'Quarters' },
      ]}
      value={address.period}
      onChange={(period) => setAddress({ ...address, period })}
    />
  );
}

/** Plan · Campaign · Initiative · Activity: the level the widget lists, defaulting to the report's own. */
export function LevelSwitch({ fallback }: { fallback: Show }) {
  const [address, setAddress] = useReportAddress();
  return (
    <SegmentedFilter
      label="Show"
      options={SHOWS.map((show) => ({ value: show, label: SHOW_WORDS[show] }))}
      value={address.show ?? fallback}
      onChange={(show) => setAddress({ ...address, show })}
    />
  );
}

interface YearControlProps {
  years: number[];
  value: number;
  /** Plans chosen in the filters, which another year clears: said before it happens (FR-011). */
  plansChosen: number;
  onChange: (year: number) => void;
}

export function YearControl({ years, value, plansChosen, onChange }: YearControlProps) {
  const note =
    plansChosen === 1
      ? 'Another year clears the plan you chose.'
      : `Another year clears the ${plansChosen} plans you chose.`;
  return (
    <Select
      label="Year"
      value={String(value)}
      options={years.map((y) => ({ value: String(y), label: String(y) }))}
      note={plansChosen > 0 ? note : undefined}
      onChange={(year) => onChange(Number(year))}
    />
  );
}
