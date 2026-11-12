import { Tag } from '@/ui/Tag/Tag';
import { PLAN_TYPE_LABELS, planTypeOf } from './plan-currency';
import type { PlanType } from './plan-currency';

export function PlanTypeTag({ plan }: { plan: { planType?: PlanType } }) {
  return <Tag>{PLAN_TYPE_LABELS[planTypeOf(plan)]}</Tag>;
}
