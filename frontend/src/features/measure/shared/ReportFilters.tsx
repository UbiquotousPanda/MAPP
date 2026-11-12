import { AttributeFilterMenu, FilterMenu } from '@/features/all-work';
import type { FilterableAttribute, FilterChoice } from '@/features/all-work';
import type { ReportChoices } from './api';
import type { ReportAddress } from './report-address';
import { PLAN_TYPE_WORDS, STATUS_WORDS } from './report-text';

type ListKey = 'plans' | 'planTypes' | 'teams' | 'owners' | 'activityTypes' | 'activityStatuses';

interface ReportFiltersProps {
  choices: ReportChoices;
  applied: ReportAddress;
  onApply: (next: ReportAddress) => void;
}

/** All work's filter buttons: one per filter and More filters for the Shell attributes; each applies at once. */
export function ReportFilters({ choices, applied, onApply }: ReportFiltersProps) {
  const lists: { key: ListKey; label: string; choices: FilterChoice[] }[] = [
    { key: 'plans', label: 'Plans', choices: choices.plans.map((p) => named(p.id, p.name)) },
    {
      key: 'planTypes',
      label: 'Plan type',
      choices: choices.planTypes.map((t) => named(t, PLAN_TYPE_WORDS[t])),
    },
    {
      key: 'teams',
      label: 'Team',
      choices: [...choices.teams]
        .sort((a, b) => Number(b.mine) - Number(a.mine))
        .map((t) => named(t.id, t.name)),
    },
    { key: 'owners', label: 'Owner', choices: choices.owners.map((o) => named(o.id, o.name)) },
    {
      key: 'activityTypes',
      label: 'Activity type',
      choices: choices.activityTypes.map((t) => named(t.id, t.name)),
    },
    {
      key: 'activityStatuses',
      label: 'Activity status',
      choices: choices.activityStatuses.map((s) => named(s, STATUS_WORDS[s])),
    },
  ];
  return (
    <>
      {lists.map((list) => (
        <FilterMenu
          key={list.key}
          label={list.label}
          choices={list.choices}
          selected={applied[list.key]}
          multiple
          summary={summaryOf(list.choices, applied[list.key])}
          onChange={(values) => onApply({ ...applied, [list.key]: values })}
        />
      ))}
      <AttributeFilterMenu
        attributes={attributesOf(choices)}
        selected={applied.attributes}
        onChange={(attributes) => onApply({ ...applied, attributes })}
      />
    </>
  );
}

const named = (value: string, label: string): FilterChoice => ({ value, label });

/** "Team · Lubricants Europe" for one value, "Owner · 2" for several, nothing when not in use. */
function summaryOf(choices: FilterChoice[], selected: string[]): string | undefined {
  if (selected.length === 1) {
    return choices.find((c) => c.value === selected[0])?.label ?? '1';
  }
  return selected.length > 1 ? String(selected.length) : undefined;
}

/** All work's menu adds Not filled in itself, so the report's own "none" value is left out here. */
function attributesOf(choices: ReportChoices): FilterableAttribute[] {
  return choices.attributeGroups.map((g) => ({
    id: g.attributeId,
    label: g.label,
    level: g.level,
    type: 'choice',
    values: g.values
      .filter((v) => v.id !== 'none')
      .map((v) => ({ id: v.id, label: v.label, inactive: !v.active })),
  }));
}
