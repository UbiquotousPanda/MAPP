import type { components } from '@/api/generated/schema';
import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import { joinWithAnd, plural } from '@/format/text';

export type PlanStatus = components['schemas']['PlanStatus'];
export type SpreadMethod = components['schemas']['SpreadMethod'];
export type GoalStage = components['schemas']['GoalStage'];
export type ApprovalProgress = components['schemas']['ApprovalProgress'];
type PlanContents = components['schemas']['PlanContents'];
type RecordRef = components['schemas']['RecordRef'];

export const STATUS: Record<PlanStatus, { word: string; tone: StatusTone }> = {
  draft: { word: 'Draft', tone: 'neutral' },
  published: { word: 'Published', tone: 'positive' },
};

export const SPREAD_METHODS: readonly SpreadMethod[] = [
  'evenly',
  'firstMonth',
  'lastMonth',
  'custom',
];

export const SPREAD_LABELS: Record<SpreadMethod, string> = {
  evenly: 'Evenly',
  firstMonth: 'All in first month',
  lastMonth: 'All in last month',
  custom: 'Custom',
};

export const GOAL_STAGES: readonly GoalStage[] = ['inq', 'mql', 'revenue'];

export const STAGE_OPTIONS: Record<GoalStage, string> = {
  inq: 'INQ (inquiries)',
  mql: 'MQL (marketing-qualified leads)',
  revenue: 'Revenue',
};

export const STAGE_WORDS: Record<GoalStage, string> = {
  inq: 'INQ',
  mql: 'MQL',
  revenue: 'Revenue',
};

export function goalAmountLabel(stage: GoalStage): string {
  return stage === 'revenue' ? 'Goal amount (Revenue, USD)' : `Goal amount (${STAGE_WORDS[stage]})`;
}

/** Only the levels the plan has; "" when it holds nothing. */
export function contentsText(contents: PlanContents): string {
  const parts = [
    [contents.campaigns, 'campaign', 'campaigns'],
    [contents.initiatives, 'initiative', 'initiatives'],
    [contents.activities, 'activity', 'activities'],
    [contents.lineItems, 'line item', 'line items'],
  ] as const;
  return joinWithAnd(
    parts.filter(([count]) => count > 0).map(([count, one, many]) => plural(count, one, many)),
  );
}

export function yearDates(year: number, dateRange: (start: string, end: string) => string): string {
  return dateRange(`${year}-01-01`, `${year}-12-31`);
}

/** "No activities yet" rather than "0 of 0". */
export function activitiesApprovedText(approved: number, activities: number): string {
  if (activities === 0) {
    return 'No activities yet';
  }
  return `${approved} of ${activities} ${activities === 1 ? 'activity' : 'activities'} approved`;
}

export function groupLabel(record: RecordRef): string {
  if (record.type === 'plan') {
    return 'Plan';
  }
  return `${typeWord(record.type)} '${record.name}'`;
}

export function typeWord(type: string): string {
  if (type === 'lineItem') {
    return 'Line item';
  }
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

export function fieldsNeededText(count: number): string {
  return count === 1 ? '1 field needed' : `${count} fields needed`;
}

export const YEAR_LOCKED =
  "Year can't change once the plan is saved — copy the plan into the next year or create a new plan.";

export const PUBLISHED_BANNER =
  'This plan is published. Changes are saved straight away and recorded in the activity log.';

export const APPLIES_FROM_NOW = 'Applies to line items created from now on.';

export const NOT_FOUND_TITLE = 'Plan not found';
export const NOT_FOUND_TEXT = 'This plan no longer exists — someone may have deleted it.';

export const MY_TEAMS_HINT = 'You can still open every plan.';

export const NO_CAMPAIGNS =
  'No campaigns yet — a campaign is a theme that runs for most of the year.';

type PlanAllocation = components['schemas']['PlanAllocation'];

export function allocatedFromText(allocation: PlanAllocation): string {
  return `Allocated from '${allocation.globalBudget.name}'`;
}

/** The API's reason when it sends one, else "Allocated from '<global budget>' — ask <owner> to change it." */
export function allocationLockText(allocation: PlanAllocation, reason: string | undefined): string {
  if (reason) {
    return reason;
  }
  const whom = allocation.owner ? allocation.owner.name : "the global budget's owner";
  return `${allocatedFromText(allocation)} — ask ${whom} to change it.`;
}

export const PHASING_REMOVED = 'Budget by month will be removed when you save.';
