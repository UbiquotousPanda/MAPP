import { CheckboxField } from '@/ui/CheckboxField/CheckboxField';
import { useFormatters } from '@/format/useFormatters';
import { HELD_BACK, UNTICKED_STAY } from './line-item-choices';
import type { RoundLineItem } from './line-item-choices';
import styles from './LineItemChoices.module.css';

export interface LineItemChoicesProps {
  items: RoundLineItem[];
  ticked: ReadonlySet<string>;
  onChange: (id: string, checked: boolean) => void;
}

/** The line items the round decides, each ticked to approve it (053 FR-001, FR-002). */
export function LineItemChoices({ items, ticked, onChange }: LineItemChoicesProps) {
  const { money } = useFormatters();
  return (
    <fieldset className={styles.choices}>
      <legend className={styles.legend}>Line items to approve</legend>
      <p className={styles.explanation}>{UNTICKED_STAY}</p>
      {items.map((item) => (
        <CheckboxField
          key={item.id}
          name={`approve-${item.id}`}
          label={`${item.id} · ${item.name}`}
          hint={money(item.plannedCost)}
          checked={!item.heldBack && ticked.has(item.id)}
          onChange={(checked) => onChange(item.id, checked)}
          disabledReason={item.heldBack ? HELD_BACK : undefined}
        />
      ))}
    </fieldset>
  );
}
