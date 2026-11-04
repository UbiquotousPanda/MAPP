import type { ReportChoices } from './api';
import { attrKey, restrictTo } from './filter-keys';
import type { Ticked } from './filter-keys';
import type { GroupOption } from './FilterGroup';
import type { ReportAddress } from './report-address';
import { PLAN_TYPE_WORDS, STATUS_WORDS } from './report-text';

/** What the panel holds before it is applied: the year and, per group, the values ticked. */
export interface Draft {
  year: number;
  ticked: Record<string, Ticked>;
}

export const LIST_KEYS = [
  'plans',
  'planTypes',
  'teams',
  'owners',
  'activityTypes',
  'activityStatuses',
] as const;

export type ListKey = (typeof LIST_KEYS)[number];

export const TITLES: Record<ListKey, string> = {
  plans: 'Plans',
  planTypes: 'Plan type',
  teams: 'Team',
  owners: 'Owner',
  activityTypes: 'Activity type',
  activityStatuses: 'Activity status',
};

export function draftOf(applied: ReportAddress, year: number): Draft {
  const ticked: Record<string, Ticked> = {};
  for (const key of LIST_KEYS) {
    ticked[key] = applied[key].length > 0 ? [...applied[key]] : null;
  }
  for (const attr of applied.attributes) {
    ticked[attrKey(attr.attributeId)] = [...attr.values];
  }
  return { year, ticked };
}

/** One string per draft, so two drafts compare by value. */
export function draftKey(draft: Draft): string {
  return JSON.stringify(draft);
}

export function optionsOf(choices: ReportChoices): Record<ListKey, GroupOption[]> {
  return {
    plans: choices.plans.map((p) => ({ id: p.id, label: p.name })),
    planTypes: choices.planTypes.map((t) => ({ id: t, label: PLAN_TYPE_WORDS[t] })),
    teams: [...choices.teams]
      .sort((a, b) => Number(b.mine) - Number(a.mine))
      .map((t) => ({ id: t.id, label: t.name })),
    owners: choices.owners.map((o) => ({ id: o.id, label: o.name })),
    activityTypes: choices.activityTypes.map((t) => ({ id: t.id, label: t.name })),
    activityStatuses: choices.activityStatuses.map((s) => ({ id: s, label: STATUS_WORDS[s] })),
  };
}

/** The address the draft stands for: a group with every value ticked restricts nothing. */
export function addressOf(
  draft: Draft,
  applied: ReportAddress,
  choices: ReportChoices,
): ReportAddress {
  const options = optionsOf(choices);
  const ids = (key: ListKey) =>
    restrictTo(
      options[key].map((o) => o.id),
      draft.ticked[key] ?? null,
    );
  return {
    ...applied,
    year: draft.year,
    plans: ids('plans'),
    planTypes: restrictTo(choices.planTypes, draft.ticked.planTypes ?? null),
    teams: ids('teams'),
    owners: ids('owners'),
    activityTypes: ids('activityTypes'),
    activityStatuses: restrictTo(choices.activityStatuses, draft.ticked.activityStatuses ?? null),
    attributes: choices.attributeGroups.flatMap((g) => {
      const values = restrictTo(
        g.values.map((v) => v.id),
        draft.ticked[attrKey(g.attributeId)] ?? null,
      );
      return values.length > 0 ? [{ attributeId: g.attributeId, values }] : [];
    }),
  };
}

/** A group with nothing ticked would match nothing, so it can't be applied. */
export function emptyGroups(draft: Draft, choices: ReportChoices): string[] {
  const lists = LIST_KEYS.filter((key) => draft.ticked[key]?.length === 0).map(
    (key) => TITLES[key],
  );
  const attributes = choices.attributeGroups
    .filter((g) => draft.ticked[attrKey(g.attributeId)]?.length === 0)
    .map((g) => g.label);
  return [...lists, ...attributes];
}

export function yearNote(plans: number): string {
  return plans === 1
    ? 'Another year clears the plan you chose.'
    : `Another year clears the ${plans} plans you chose.`;
}
