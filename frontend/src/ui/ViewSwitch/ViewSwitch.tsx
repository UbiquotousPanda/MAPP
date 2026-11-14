import { ChartColumn, Table2 } from 'lucide-react';
import { SegmentedFilter } from '../SegmentedFilter/SegmentedFilter';

export type ViewChoice = 'chart' | 'table';

export interface ViewSwitchProps {
  label: string;
  value: ViewChoice;
  onChange: (value: ViewChoice) => void;
}

const OPTIONS = [
  { value: 'chart' as const, label: 'Chart', icon: <ChartColumn aria-hidden="true" /> },
  { value: 'table' as const, label: 'Table', icon: <Table2 aria-hidden="true" /> },
];

export function ViewSwitch({ label, value, onChange }: ViewSwitchProps) {
  return <SegmentedFilter label={label} options={OPTIONS} value={value} onChange={onChange} />;
}
