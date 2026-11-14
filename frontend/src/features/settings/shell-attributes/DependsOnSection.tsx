import { useFormContext, useWatch } from 'react-hook-form';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import type { ChoiceOption } from '@/ui/ChoiceField/ChoiceField';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { FormField } from '@/ui/FormField/FormField';
import { FormSection } from '@/ui/FormSection/FormSection';
import { ReadOnlyField } from '@/ui/ReadOnlyField/ReadOnlyField';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import type { useAttributeForm } from '../api';
import { chooseParent, NONE } from './attribute-choices';
import { conditionText, isChoiceType, lockReason, parentCandidates } from './attribute-words';
import type { ShellAttribute } from './api';
import type { AttributeValues } from './schemas';

const CONDITION_LABEL = "Shown when the plan's business unit includes";
const NO_BUSINESS_UNIT = "There is no Business unit attribute yet, so conditions can't be set.";

export interface DependsOnSectionProps {
  attribute?: ShellAttribute;
  allAttributes: ShellAttribute[];
  /** The level's form: its Business unit options. */
  levelForm: ReturnType<typeof useAttributeForm>;
}

/** Depends on and condition (FR-022, FR-023). */
export function DependsOnSection({ attribute, allAttributes, levelForm }: DependsOnSectionProps) {
  const form = useFormContext<AttributeValues>();
  const [level, type, section, parentAttributeId] = useWatch({
    control: form.control,
    name: ['level', 'type', 'section', 'parentAttributeId'],
  });
  const parentLock = attribute && lockReason(attribute, 'parentAttributeId');
  const conditionLock = attribute && lockReason(attribute, 'condition');

  // Depends on: the choice attributes placed before it, and the one it depends on now.
  const candidates = parentCandidates(allAttributes, level, section, attribute);
  const chosenParent = allAttributes.find((each) => each.id === parentAttributeId);
  if (chosenParent && !candidates.includes(chosenParent)) {
    candidates.push(chosenParent);
  }
  const parentOptions: ChoiceOption[] = [
    { id: NONE, label: 'None', active: true },
    ...candidates.map((each) => ({ id: each.id, label: each.label, active: each.active })),
  ];

  const formData = levelForm.data;
  if (!formData) {
    return (
      <FormSection title="Depends on and condition">
        {levelForm.isError ? (
          <ErrorState error={levelForm.error} onRetry={() => void levelForm.refetch()} />
        ) : (
          <Skeleton lines={3} height="18px" />
        )}
      </FormSection>
    );
  }

  return (
    <FormSection title="Depends on and condition">
      {isChoiceType(type) &&
        (parentLock && attribute ? (
          <ReadOnlyField
            label="Depends on"
            value={attribute.parentAttribute?.name ?? 'None'}
            lock={parentLock}
          />
        ) : (
          <FormField
            control={form.control}
            name="parentAttributeId"
            render={(field) => (
              <ChoiceField
                label="Depends on"
                tip="Its options are filtered by the value chosen for that attribute."
                options={parentOptions}
                {...field}
                value={field.value || NONE}
                onChange={(next) => chooseParent(form, next || NONE)}
              />
            )}
          />
        ))}
      {conditionLock && attribute ? (
        <ReadOnlyField
          label={CONDITION_LABEL}
          value={conditionText(attribute) ?? 'Always shown'}
          lock={conditionLock}
        />
      ) : formData.businessUnitAttributeId === null ? (
        <ReadOnlyField label={CONDITION_LABEL} value="Always shown" lock={NO_BUSINESS_UNIT} />
      ) : (
        <FormField
          control={form.control}
          name="conditionOptionIds"
          render={(field) => (
            <ChoiceField
              label={CONDITION_LABEL}
              tip="Leave all unticked to show it always."
              multiple
              options={formData.businessUnitOptions.map((option) => ({
                id: option.id,
                label: option.label,
                active: option.active,
              }))}
              {...field}
            />
          )}
        />
      )}
    </FormSection>
  );
}
