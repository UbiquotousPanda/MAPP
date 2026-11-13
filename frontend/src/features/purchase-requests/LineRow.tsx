import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import type { ChoiceOption } from '@/ui/ChoiceField/ChoiceField';
import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import { FormField } from '@/ui/FormField/FormField';
import { HxKey } from '@/ui/HxKey/HxKey';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { MoneyField } from '@/ui/MoneyField/MoneyField';
import { ShellAttributeFields } from '@/ui/ShellAttributeFields/ShellAttributeFields';
import type { AttributeForm } from '@/ui/ShellAttributeFields/rules';
import { TextAreaField } from '@/ui/TextAreaField/TextAreaField';
import { DateField } from '@/ui/DateField/DateField';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import { problemAt, problemMap } from './form-problems';
import type { LineValues, PurchaseRequestFormValues } from './form-schema';
import { LABELS, LINE_ATTRIBUTES_TITLE, lineTitle, NO_SWBS, SWBS_HINT } from './form-text';
import { HX_LABEL } from './purchase-request-text';
import styles from './LineRowsEditor.module.css';

const DESCRIPTION_MAX = 2000;

export interface LineRowProps {
  index: number;
  line: LineValues;
  control: Control<PurchaseRequestFormValues>;
  problems: FieldProblem[];
  currencies: ChoiceOption[];
  attributeForm: AttributeForm;
  /** Remove line, or why not. */
  removal: ReactNode;
  /** "Changed" or "New", while a change of an approved purchase request is edited. */
  mark?: string;
}

/** One PR line (032 FR-011): the line item and HX key read-only, then its own fields. */
export function LineRow({
  index,
  line,
  control,
  problems,
  currencies,
  attributeForm,
  removal,
  mark,
}: LineRowProps) {
  const titleId = useId();
  const id = (field: string) => `lines[${index}].${field}`;
  const error = (field: string) => problemAt(problems, id(field));

  return (
    <section className={styles.line} aria-labelledby={titleId}>
      <div className={styles.lineHeader}>
        <div className={styles.lineTitle}>
          <SectionHeading level={3} rank="sub" id={titleId}>
            {lineTitle(index + 1, line.lineItem.name, line.lineItem.id)}
          </SectionHeading>
        </div>
        {mark && <span className={styles.mark}>{mark}</span>}
        <div className={styles.removal}>{removal}</div>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>
            {LABELS.hxKey}
            <InfoTip label={LABELS.hxKey} text={HX_LABEL} />
          </dt>
          <dd>
            <HxKey value={line.hxKey} />
          </dd>
        </div>
        <div>
          <dt>
            {LABELS.swbsCode}
            <InfoTip label={LABELS.swbsCode} text={SWBS_HINT} />
          </dt>
          <dd>
            <span className={styles.code}>{line.lineItem.swbsCode || NO_SWBS}</span>
          </dd>
        </div>
      </dl>
      <div className={styles.grid}>
        <FormField
          control={control}
          name={`lines.${index}.currency`}
          render={(field) => (
            <ChoiceField
              {...field}
              name={id('currency')}
              label={LABELS.currency}
              marking="Required"
              options={currencies}
              error={error('currency')}
            />
          )}
        />
        <FormField
          control={control}
          name={`lines.${index}.amount`}
          render={(field) => (
            <MoneyField
              {...field}
              name={id('amount')}
              label={LABELS.amount}
              marking="Required"
              currency={line.currency}
              error={error('amount')}
            />
          )}
        />
        <FormField
          control={control}
          name={`lines.${index}.deliveryDate`}
          render={(field) => (
            <DateField
              {...field}
              name={id('deliveryDate')}
              label={LABELS.deliveryDate}
              marking="Required"
              error={error('deliveryDate')}
            />
          )}
        />
        <FormField
          control={control}
          name={`lines.${index}.overallLimit`}
          render={(field) => (
            <MoneyField
              {...field}
              name={id('overallLimit')}
              label={LABELS.overallLimit}
              marking="Needed to submit"
              currency={line.currency}
              error={error('overallLimit')}
            />
          )}
        />
      </div>
      <FormField
        control={control}
        name={`lines.${index}.description`}
        render={(field) => (
          <TextAreaField
            {...field}
            name={id('description')}
            label={LABELS.lineDescription}
            maxLength={DESCRIPTION_MAX}
            rows={2}
            error={error('description')}
          />
        )}
      />
      {attributeForm.sections.length > 0 && (
        <div className={styles.attributes}>
          <SectionHeading level={4} rank="label" divided>
            {LINE_ATTRIBUTES_TITLE}
          </SectionHeading>
          <FormField
            control={control}
            name={`lines.${index}.attributes`}
            render={(field) => (
              <ShellAttributeFields
                form={attributeForm}
                values={field.value}
                onChange={field.onChange}
                businessUnit={[]}
                errors={problemMap(problems)}
                sectionHeading="none"
                fieldPrefix={`lines[${index}].`}
              />
            )}
          />
        </div>
      )}
    </section>
  );
}
