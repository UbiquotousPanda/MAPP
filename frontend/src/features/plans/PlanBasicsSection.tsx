import { CheckboxField } from '@/ui/CheckboxField/CheckboxField';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import { FieldRow } from '@/ui/FieldRow/FieldRow';
import { FormField } from '@/ui/FormField/FormField';
import { FormCard } from '@/ui/FormRail/FormRail';
import { TextAreaField } from '@/ui/TextAreaField/TextAreaField';
import { ReadOnlyField } from '@/ui/ReadOnlyField/ReadOnlyField';
import { TextField } from '@/ui/TextField/TextField';
import type { components } from '@/api/generated/schema';
import { PersonField, TeamField } from '@/features/people';
import { useFieldHelp } from '@/features/settings';
import { formatMoneyText, formatPercent } from '@/format/decimal';
import type { Plan, PlanDefaults } from './api';
import { PLAN_TYPE_LABELS, PLAN_TYPES } from './plan-currency';
import type { SectionProps } from './plan-form-sections';
import { YEAR_LOCKED } from './plan-text';
import { useOfferedTeams } from './useOfferedTeams';

type Model = components['schemas']['Model'];

export interface PlanBasicsSectionProps extends SectionProps {
  /** Create: the defaults the form starts with and the years to choose from. */
  defaults?: PlanDefaults;
  models: Model[];
  chosenModel: Plan['model'] | undefined;
  /** The chosen owner's name, for the note when they are in none of the chosen teams. */
  ownerName: string;
  onYearChange: (year: string) => void;
}

/** Basics: name, year, plan type (016), model, teams, owner, AOP and description. */
export function PlanBasicsSection({
  control,
  values,
  mode,
  plan,
  with016,
  defaults,
  models,
  chosenModel,
  ownerName,
  onYearChange,
}: PlanBasicsSectionProps) {
  const { help } = useFieldHelp();
  const offeredTeams = useOfferedTeams(mode);
  const modelOptions = models.map((model) => ({
    id: model.id,
    label: model.name,
    active: model.active,
  }));
  if (plan && !models.some((model) => model.id === plan.model.id)) {
    modelOptions.push({ id: plan.model.id, label: plan.model.name, active: plan.model.active });
  }

  return (
    <FormCard id="plan-basics" title="Basics">
      <FieldRow>
        <FormField
          control={control}
          name="name"
          render={(field) => (
            <TextField
              label="Plan name"
              marking="Required"
              tip={help('plan.name')}
              maxLength={120}
              {...field}
            />
          )}
        />
        {mode === 'create' ? (
          <FormField
            control={control}
            name="year"
            render={(field) => (
              <ChoiceField
                label="Year"
                marking="Required"
                tip={help('plan.year')}
                options={(defaults?.years ?? [Number(field.value)]).map((year) => ({
                  id: String(year),
                  label: String(year),
                  active: true,
                }))}
                {...field}
                onChange={(year) => {
                  onYearChange(year);
                  field.onChange(year);
                }}
              />
            )}
          />
        ) : (
          <ReadOnlyField
            label="Year"
            tip={help('plan.year')}
            value={values.year}
            lock={YEAR_LOCKED}
          />
        )}
        {with016 && (
          <FormField
            control={control}
            name="planType"
            render={(field) => (
              <ChoiceField
                label="Plan type"
                marking="Required"
                tip={help('plan.planType')}
                options={PLAN_TYPES.map((type) => ({
                  id: type,
                  label: PLAN_TYPE_LABELS[type],
                  active: true,
                }))}
                {...field}
                onChange={(type) =>
                  field.onChange(PLAN_TYPES.find((known) => known === type) ?? field.value)
                }
              />
            )}
          />
        )}
      </FieldRow>
      <FieldRow>
        <FormField
          control={control}
          name="modelId"
          render={(field) => (
            <ChoiceField
              label="Model"
              marking="Required"
              tip={help('plan.model')}
              options={modelOptions}
              note={
                chosenModel
                  ? `INQ→MQL ${formatPercent(chosenModel.inqToMqlRate)} · MQL→deal ${formatPercent(chosenModel.mqlToDealRate)} · average deal size ${formatMoneyText(chosenModel.averageDealSize)}`
                  : undefined
              }
              {...field}
            />
          )}
        />
        <FormField
          control={control}
          name="teamIds"
          render={(field) => (
            <TeamField
              label="Teams"
              marking="Needed to publish"
              tip={help('plan.teams')}
              offered={offeredTeams}
              {...field}
            />
          )}
        />
        <FormField
          control={control}
          name="ownerId"
          render={(field) => (
            <PersonField
              label="Owner"
              marking="Needed to publish"
              tip={help('plan.owner')}
              teamIds={values.teamIds}
              notMemberText={`${ownerName} isn't in any of the chosen teams — choose another owner or clear the field`}
              {...field}
            />
          )}
        />
      </FieldRow>
      <FormField
        control={control}
        name="aop"
        render={({ name, value, onChange }) => (
          <CheckboxField
            label="Strategic / AOP plan"
            name={name}
            tip={help('plan.aop')}
            checked={value}
            onChange={onChange}
          />
        )}
      />
      <FormField
        control={control}
        name="description"
        render={(field) => (
          <TextAreaField
            label="Description"
            tip={help('plan.description')}
            maxLength={2000}
            {...field}
          />
        )}
      />
    </FormCard>
  );
}
