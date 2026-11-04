import { useState } from 'react';
import { Button } from '@/ui/Button/Button';
import { Tabs } from '@/ui/Tabs/Tabs';
import type { ReportAttributeGroup } from './api';
import { Disclosure } from './Disclosure';
import { attrKey } from './filter-keys';
import type { Ticked } from './filter-keys';
import { FilterGroup } from './FilterGroup';
import { LEVEL_WORDS } from './report-text';
import styles from './ReportFrame.module.css';

type Level = 'plan' | 'campaign' | 'initiative' | 'activity' | 'lineItem';

const LEVELS: Level[] = ['plan', 'campaign', 'initiative', 'activity', 'lineItem'];

interface LevelTabsProps {
  groups: ReportAttributeGroup[];
  ticked: Record<string, Ticked>;
  onChange: (changes: Record<string, Ticked>) => void;
}

function summaryOf(groups: ReportAttributeGroup[], ticked: Record<string, Ticked>): string {
  const restricting = groups.filter((g) => ticked[attrKey(g.attributeId)] != null).length;
  if (restricting === 0) {
    return 'All';
  }
  return `${restricting} ${restricting === 1 ? 'attribute' : 'attributes'}`;
}

/** One tab per level holding its Shell-attribute groups, with Select all and Clear all for the tab. */
export function LevelTabs({ groups, ticked, onChange }: LevelTabsProps) {
  const [level, setLevel] = useState<Level>('activity');
  const ofLevel = groups.filter((g) => g.level === level);
  const setAll = (value: Ticked) =>
    onChange(Object.fromEntries(ofLevel.map((g) => [attrKey(g.attributeId), value])));
  const summary = summaryOf(groups, ticked);

  return (
    <Disclosure
      groupKey="attributes"
      title="Shell attributes"
      summary={summary}
      defaultOpen={summary !== 'All'}
      forceOpen={groups.some((g) => ticked[attrKey(g.attributeId)]?.length === 0)}
    >
      <div className={styles.levels}>
        <Tabs
          label="Shell attributes by level"
          tabs={LEVELS.map((value) => ({ value, label: LEVEL_WORDS[value] ?? value }))}
          value={level}
          onChange={setLevel}
        >
          {ofLevel.length === 0 ? (
            <p className={styles.muted}>
              No {(LEVEL_WORDS[level] ?? level).toLowerCase()} attributes to filter by.
            </p>
          ) : (
            <>
              <div className={styles.groupActions}>
                <Button type="button" size="sm" variant="tertiary" onClick={() => setAll(null)}>
                  Select all
                </Button>
                <Button type="button" size="sm" variant="tertiary" onClick={() => setAll([])}>
                  Clear all
                </Button>
              </div>
              {ofLevel.map((group) => (
                <FilterGroup
                  key={group.attributeId}
                  groupKey={attrKey(group.attributeId)}
                  title={group.label}
                  options={group.values.map((v) => ({
                    id: v.id,
                    label: v.active ? v.label : `${v.label} (inactive)`,
                  }))}
                  ticked={ticked[attrKey(group.attributeId)] ?? null}
                  onChange={(next) => onChange({ [attrKey(group.attributeId)]: next })}
                />
              ))}
            </>
          )}
        </Tabs>
      </div>
    </Disclosure>
  );
}
