import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import type { ReportAddress } from '../shared';
import { useOwnParam } from '../shared/useOwnParam';
import { useFunnelReport } from '../revenue/api';
import { isStage } from '../funnel/stages';
import type { Stage } from './stage';

const LABELS: Record<Stage, string> = { revenue: 'Revenue', mql: 'MQL', inq: 'INQ' };

/** Revenue · MQL · INQ: the funnel stages only when a model in view allows them (049-C11). */
export function StagePicker({ stage, address }: { stage: Stage; address: ReportAddress }) {
  const [category] = useOwnParam('category');
  const [, setStage] = useOwnParam('stage');
  const funnel = useFunnelReport(address, {
    category: category || undefined,
    stage: isStage(stage) ? stage : undefined,
  });
  const available = funnel.data?.availableStages ?? [];
  const stages = (['revenue', 'mql', 'inq'] as const).filter(
    (s) => s === 'revenue' || s === stage || available.includes(s),
  );
  return (
    <SegmentedFilter
      label="Stage"
      options={stages.map((s) => ({ value: s, label: LABELS[s] }))}
      value={stage}
      onChange={setStage}
    />
  );
}
