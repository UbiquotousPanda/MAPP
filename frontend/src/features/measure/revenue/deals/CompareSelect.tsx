import { Select } from '@/ui/Select/Select';
import { isModel } from './address';
import type { AttributionModel } from './api';

const MODEL_NAMES: [AttributionModel, string][] = [
  ['firstTouch', 'First touch'],
  ['lastTouch', 'Last touch'],
  ['equallyDistributed', 'Equally distributed'],
  ['linearTimeDecay', 'Linear time decay'],
  ['uShaped', 'U-shaped'],
];

interface CompareSelectProps {
  designated: AttributionModel;
  value: AttributionModel | null;
  onChange: (model: AttributionModel | null) => void;
}

/** Compare with: the four models other than the designated one, for this activity only (058 US2). */
export function CompareSelect({ designated, value, onChange }: CompareSelectProps) {
  const others = MODEL_NAMES.filter(([key]) => key !== designated);
  return (
    <Select
      label="Compare with"
      value={value ?? ''}
      options={[
        { value: '', label: 'No comparison' },
        ...others.map(([key, name]) => ({ value: key, label: name })),
      ]}
      onChange={(next) => onChange(isModel(next) ? next : null)}
    />
  );
}
