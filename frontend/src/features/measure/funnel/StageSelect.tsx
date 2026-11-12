import { Select } from '@/ui/Select/Select';
import type { ReportAddress } from '../shared';
import { useOwnParam } from '../shared/useOwnParam';
import { useFunnelReport } from '../revenue/api';
import { stageName } from './stage-words';
import { isStage } from './stages';

/** The funnel stage selector: every stage any model in view allows, in funnel order (049-C11). */
export function StageSelect({
  stage,
  available,
  onChange,
}: {
  stage: string;
  available: string[];
  onChange: (stage: string) => void;
}) {
  return (
    <Select
      label="Funnel stage"
      value={stage}
      options={available.map((s) => ({ value: s, label: stageName(s) }))}
      onChange={onChange}
    />
  );
}

/** The stage select bound to the address; its stages come from the report it shares a cache with. */
export function StageControl({ address }: { address: ReportAddress }) {
  const [category] = useOwnParam('category');
  const [stage, setStage] = useOwnParam('stage');
  const report = useFunnelReport(address, {
    category: category || undefined,
    stage: isStage(stage) ? stage : undefined,
  });
  const chosen = stage || report.data?.stage || 'inq';
  return (
    <StageSelect
      stage={chosen}
      available={report.data?.availableStages ?? [chosen]}
      onChange={setStage}
    />
  );
}
