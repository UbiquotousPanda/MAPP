import { Select } from '@/ui/Select/Select';
import type { BreakdownChoice, Grouping } from './all-work-types';
import { BREAK_DOWN_BY, LEVEL_LABELS, NOTHING_ELSE, THEN_BY } from './breakdown-text';
import styles from './GroupingPickers.module.css';

export interface GroupingPickersProps {
  groupings: Grouping[];
  choice: BreakdownChoice;
  onChange: (choice: BreakdownChoice) => void;
}

/** A Shell attribute says its level after its name: "Brands (Activity)". */
function optionsOf(groupings: Grouping[]) {
  return groupings.map((grouping) => ({
    value: grouping.key,
    label: grouping.level
      ? `${grouping.label} (${LEVEL_LABELS[grouping.level] ?? grouping.level})`
      : grouping.label,
  }));
}

export function GroupingPickers({ groupings, choice, onChange }: GroupingPickersProps) {
  const others = groupings.filter((grouping) => grouping.key !== choice.by);

  return (
    <div className={styles.pickers}>
      <Select
        label={BREAK_DOWN_BY}
        value={choice.by}
        options={optionsOf(groupings)}
        onChange={(by) => onChange({ by, thenBy: choice.thenBy === by ? null : choice.thenBy })}
      />
      <Select
        label={THEN_BY}
        value={choice.thenBy ?? ''}
        options={[{ value: '', label: NOTHING_ELSE }, ...optionsOf(others)]}
        onChange={(thenBy) => onChange({ by: choice.by, thenBy: thenBy || null })}
      />
    </div>
  );
}
