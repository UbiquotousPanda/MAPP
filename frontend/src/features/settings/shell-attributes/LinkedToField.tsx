import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import type { components } from '@/api/generated/schema';
import { linkedToHint } from './attribute-words';

type FormAttribute = components['schemas']['FormAttribute'];

export interface LinkedToFieldProps {
  /** The field's name, as the API names its problems: "parentOptionIds", "optionLinks.SO-1012". */
  name: string;
  parent: FormAttribute;
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

/** Only active parent options can be newly linked; inactive ones already linked stay. */
export function LinkedToField({ name, parent, value, onChange, error }: LinkedToFieldProps) {
  return (
    <ChoiceField
      label="Linked to"
      name={name}
      marking="Required"
      tip={linkedToHint(parent.label)}
      multiple
      options={parent.options.map((option) => ({
        id: option.id,
        label: option.label,
        active: option.active,
      }))}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}
