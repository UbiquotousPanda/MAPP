import revenueStyles from '../Revenue.module.css';
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
    <label className={revenueStyles.field}>
      Compare with
      <select
        value={value ?? ''}
        onChange={(e) => onChange(isModel(e.target.value) ? e.target.value : null)}
      >
        <option value="">No comparison</option>
        {others.map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
