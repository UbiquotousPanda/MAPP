import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, LinkButton } from '@/ui/Button/Button';
import { FormErrorSummary } from '@/ui/FormErrorSummary/FormErrorSummary';
import { FormFooter } from '@/ui/FormFooter/FormFooter';
import { FailureMessage } from '@/ui/FormPanel/FormPanel';
import { FormLayout, FormPage } from '@/ui/FormRail/FormRail';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import type { AttributeForm } from '@/ui/ShellAttributeFields/rules';
import { CHECK_ON_SAVE, useFormProblems } from '@/ui/useFormProblems';
import { useUnsavedChanges } from '@/ui/useUnsavedChanges';
import styles from './LineItemForm.module.css';
import type { LineItemFormState } from './line-item-form-state';
import { lineItemRailSections } from './line-item-form-progress';
import { activityBreadcrumb } from './line-item-links';
import { withBalance } from './line-item-form-state';
import { toCreateBody, toPreviewBody } from './line-item-requests';
import { useLineItemPreview } from './api';
import type { LineItem, LineItemCreate, LineItemFormOptions } from './api';
import { CANCEL, GO_TO_BIN, GO_TO_PLANS, SAVE, SAVE_AND_ADD, SAVING } from './line-item-text';
import { LineItemFormCards } from './LineItemFormCards';
import { LineItemSummaryBar } from './LineItemSummaryBar';
import { LINE_ITEM_FIELDS, lineItemFormSchema } from './schemas';
import { useLineItemSave } from './useLineItemSave';

/** The fields the API names in its problems, in the form's order. */
const FIELDS = [
  'name',
  'ownerId',
  'description',
  'currency',
  'plannedCost',
  'contractedAmount',
  'financeBudgetYear',
  'financeBudgetItemId',
  'requestSwbs',
] as const;

export interface LineItemFormProps {
  mode: 'create' | 'edit';
  options: LineItemFormOptions;
  attributeForm: AttributeForm;
  businessUnit: string[];
  initial: LineItemFormState;
  stored?: LineItem;
  title: string;
  breadcrumbEnd: string;
  /** A field to focus when the page opens (?field=, from completeness links). */
  focusField?: string | null;
  focusName?: boolean;
  /** Resolves with what to do next, run once the unsaved-changes guard lets go; throws ApiError. */
  onSave: (body: LineItemCreate, addAnother: boolean) => Promise<() => void>;
  onConflict?: () => Promise<void>;
  onCancel: () => void;
}

export function LineItemForm(props: LineItemFormProps) {
  const { mode, options, attributeForm, stored, focusField, focusName } = props;
  const { activity } = options;
  // The edit-form rule: the starting values are copied once; later refreshes never change them.
  const [start] = useState(props.initial);
  const form = useForm<LineItemFormState>({
    resolver: zodResolver(lineItemFormSchema),
    defaultValues: start,
    ...CHECK_ON_SAVE,
  });
  const formProblems = useFormProblems(form, FIELDS);
  const { problems } = formProblems;
  const state = useWatch({ control: form.control, compute: (values) => values });
  const save = useLineItemSave({
    attributeForm,
    stored: stored ? { state: start, attributes: stored.attributes } : null,
    problems: formProblems,
    onSave: props.onSave,
    onConflict: props.onConflict,
  });
  const isDirty = JSON.stringify(toCreateBody(state)) !== JSON.stringify(toCreateBody(start));
  const { afterSave } = save;
  const { dialog } = useUnsavedChanges(isDirty && afterSave === null);

  // Declared after the guard: by the time it runs, the guard has let go of the page.
  useEffect(() => {
    afterSave?.();
  }, [afterSave]);

  useEffect(() => {
    const id = focusField ?? (focusName ? 'name' : null);
    const field = id ? document.getElementById(id) : null;
    field?.scrollIntoView({ block: 'center' });
    field?.focus();
  }, [focusField, focusName]);

  function update(edit: (current: LineItemFormState) => LineItemFormState) {
    const current = form.getValues();
    const next = edit(current);
    for (const key of LINE_ITEM_FIELDS) {
      if (next[key] !== current[key]) {
        form.setValue(key, next[key]);
      }
    }
  }

  const submit = (addAnother: boolean) =>
    form.handleSubmit((values) => {
      formProblems.clearProblems();
      save.save(values, addAnother);
    }, formProblems.onInvalid);

  const currencies = withStored(options.currencies, stored?.currency, (c) => c.code);
  const budgetItems = withStored(
    options.financeBudgetItems,
    stored?.financeBudgetItem ?? undefined,
    (item) => item.id,
  );
  const preview = useLineItemPreview(activity.id, toPreviewBody(state, stored?.id ?? null)).data;
  const { balanceIn, balanceInPlan } = preview ?? {};
  useEffect(() => {
    const current = form.getValues();
    const next = withBalance(current, balanceIn, balanceInPlan);
    if (next !== current) {
      form.setValue('plannedCost', next.plannedCost);
      form.setValue('costNotes', next.costNotes);
    }
  }, [form, balanceIn, balanceInPlan]);

  return (
    <FormPage>
      <PageHeader
        breadcrumb={[...activityBreadcrumb(activity), { label: props.breadcrumbEnd }]}
        title={props.title}
      />
      <form
        noValidate
        aria-busy={save.saving}
        className={styles.form}
        onSubmit={(event) => void submit(false)(event)}
      >
        <FormLayout
          sections={lineItemRailSections(state, attributeForm, props.businessUnit)}
          extra={
            <LineItemSummaryBar balance={options.balance} after={preview?.afterSaving ?? null} />
          }
        >
          {(save.failure || problems.length > 0) && (
            <div className={styles.stack}>
              {save.failure && <FailureMessage failure={save.failure} />}
              {save.failure?.gone && (
                <div>
                  {save.failure.gone === 'activity' ? (
                    <LinkButton to="/recycle-bin">{GO_TO_BIN}</LinkButton>
                  ) : (
                    <LinkButton to="/plans">{GO_TO_PLANS}</LinkButton>
                  )}
                </div>
              )}
              <FormErrorSummary errors={problems} />
            </div>
          )}
          <LineItemFormCards
            preview={preview}
            form={form}
            state={state}
            update={update}
            problems={problems}
            options={options}
            currencies={currencies}
            budgetItems={budgetItems}
            attributeForm={attributeForm}
            businessUnit={props.businessUnit}
            storedAttributes={stored?.attributes ?? {}}
            storedSwbsCode={stored?.swbsCode ?? ''}
          />
        </FormLayout>

        <FormFooter>
          <Button type="submit" variant="primary" aria-busy={save.saving || undefined}>
            {save.saving ? SAVING : SAVE}
          </Button>
          {mode === 'create' && <Button onClick={() => void submit(true)()}>{SAVE_AND_ADD}</Button>}
          <Button onClick={props.onCancel}>{CANCEL}</Button>
        </FormFooter>
      </form>

      {dialog}
    </FormPage>
  );
}

function withStored<T>(list: T[], stored: T | undefined, key: (value: T) => string): T[] {
  return stored && !list.some((value) => key(value) === key(stored)) ? [...list, stored] : list;
}
