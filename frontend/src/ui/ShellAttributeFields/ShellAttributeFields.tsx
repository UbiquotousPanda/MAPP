import { useState } from 'react';
import { Link } from 'react-router';
import {
  allAttributes,
  attributeField,
  autoFill,
  businessUnitOf,
  isEmptyValue,
  isVisible,
  parentOf,
  valuesToClear,
} from './rules';
import type { AttributeForm, AttributeValue, AttributeValues, FormAttribute } from './rules';
import { AttributeField } from './AttributeField';
import { filledOrder, HEADING_LEVELS, useColumns } from './layout';
import { SectionHeading } from '../SectionHeading/SectionHeading';
import type { HeadingRank } from '../SectionHeading/SectionHeading';
import styles from './ShellAttributeFields.module.css';
import {
  autoFilledText,
  conditionUnits,
  hasConditions,
  NO_BUSINESS_UNIT_NOTE,
  shownBecauseText,
} from './texts';

export interface ShellAttributeFieldsProps {
  form: AttributeForm;
  values: AttributeValues;
  onChange: (values: AttributeValues) => void;
  /** The plan's Business unit option ids; null on the plan form, where its own value decides. */
  businessUnit: string[] | null;
  previousValues?: AttributeValues;
  errors?: Record<string, string>;
  highlightAttributeId?: string;
  planLink?: string;
  sectionHeading?: 'h2' | 'h3' | 'h4' | 'none';
  /** 'panel' where the section's name is the card's own title. */
  sectionRank?: HeadingRank;
  /** Put before every input id, for a record inside a form: "lines[0]." (032 PR lines). */
  fieldPrefix?: string;
}

/**
 * A level's Shell attributes on a form (002 FR-024 – FR-027); input ids and `errors` keys are
 * "<fieldPrefix>attributes.<id>". Before saving, list `valuesToClear(…)` in ClearValuesDialog.
 */
export function ShellAttributeFields({
  form,
  values,
  onChange,
  businessUnit,
  previousValues = {},
  errors = {},
  highlightAttributeId,
  planLink,
  sectionHeading = 'h3',
  sectionRank = 'sub',
  fieldPrefix = '',
}: ShellAttributeFieldsProps) {
  const [autoFilled, setAutoFilled] = useState<Record<string, string>>({});
  const units = businessUnitOf(form, values, businessUnit);
  const cleared = valuesToClear(form, values, previousValues);
  const level = HEADING_LEVELS[sectionHeading];
  const { ref, columns } = useColumns<HTMLDivElement>();

  function change(attribute: FormAttribute, value: AttributeValue | undefined) {
    const next: AttributeValues = { ...values };
    if (value === undefined || isEmptyValue(attribute, value)) {
      delete next[attribute.id];
    } else {
      next[attribute.id] = value;
    }
    const result = autoFill(form, next, attribute.id);
    const messages: Record<string, string> = {};
    for (const filled of result.filled) {
      const target = allAttributes(form).find((candidate) => candidate.id === filled.attributeId);
      const parent = target && parentOf(target, form);
      const option = target?.options.find((candidate) => candidate.id === filled.optionId);
      if (target && parent && option) {
        messages[target.id] = autoFilledText(target, option.label, parent);
      }
    }
    setAutoFilled(messages);
    onChange(result.values);
  }

  return (
    <div ref={ref} className={styles.fields}>
      {units.length === 0 && hasConditions(form) && (
        <p className={styles.note}>
          {NO_BUSINESS_UNIT_NOTE}
          {planLink && (
            <>
              {' '}
              <Link to={planLink}>Open the plan</Link>
            </>
          )}
        </p>
      )}
      {form.sections.map((section) => {
        const shown = section.attributes.filter(
          (attribute) =>
            isVisible(attribute, units) &&
            (attribute.active || !isEmptyValue(attribute, values[attribute.id])),
        );
        if (shown.length === 0) {
          return null;
        }
        return (
          <div key={section.name} className={styles.section}>
            {level && (
              <div className={sectionRank === 'panel' ? styles.cardHeader : undefined}>
                <SectionHeading level={level} rank={sectionRank} divided={sectionRank === 'sub'}>
                  {section.name}
                </SectionHeading>
              </div>
            )}
            {section.conditional && (
              <p className={styles.note}>{shownBecauseText(conditionUnits(form, shown, units))}</p>
            )}
            <div className={styles.grid} data-columns={columns}>
              {filledOrder(shown, columns).map((attribute) => (
                <AttributeField
                  key={attribute.id}
                  form={form}
                  attribute={attribute}
                  values={values}
                  fieldPrefix={fieldPrefix}
                  error={errors[fieldPrefix + attributeField(attribute.id)]}
                  cleared={cleared.find((item) => item.attributeId === attribute.id)}
                  autoFilled={autoFilled[attribute.id]}
                  conditionNote={
                    !section.conditional && attribute.conditionOptionIds.length > 0
                      ? shownBecauseText(conditionUnits(form, [attribute], units))
                      : undefined
                  }
                  highlighted={attribute.id === highlightAttributeId}
                  onChange={(value) => change(attribute, value)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
