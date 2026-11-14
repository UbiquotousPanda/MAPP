import { Link } from 'react-router';
import { businessUnitOf, isEmptyValue, isVisible } from './rules';
import type { AttributeForm, AttributeValues } from './rules';
import { SectionHeading } from '../SectionHeading/SectionHeading';
import type { HeadingRank } from '../SectionHeading/SectionHeading';
import { HEADING_LEVELS } from './layout';
import styles from './ShellAttributeFields.module.css';
import { hasConditions, NO_BUSINESS_UNIT_NOTE, valueText } from './texts';

export interface ShellAttributeValuesProps {
  form: AttributeForm;
  values: AttributeValues;
  /** The plan's Business unit option ids (records below the plan); null for a plan itself. */
  businessUnit: string[] | null;
  /** The plan's address, linked from the "appear once the business unit is chosen" note. */
  planLink?: string;
  /** The heading of each attribute section; 'none' when the details have their own heading. */
  sectionHeading?: 'h2' | 'h3' | 'h4' | 'none';
  sectionRank?: HeadingRank;
}

/** Read-only, with the form's notes: "—" for empty, "(inactive)" for inactive ones; hidden attributes left out. */
export function ShellAttributeValues({
  form,
  values,
  businessUnit,
  planLink,
  sectionHeading = 'h3',
  sectionRank = 'sub',
}: ShellAttributeValuesProps) {
  const units = businessUnitOf(form, values, businessUnit);
  const level = HEADING_LEVELS[sectionHeading];

  return (
    <div className={styles.fields}>
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
              <SectionHeading level={level} rank={sectionRank}>
                {section.name}
              </SectionHeading>
            )}
            <dl className={styles.values}>
              {shown.map((attribute) => (
                <div key={attribute.id} className={styles.pair}>
                  <dt>{attribute.label}</dt>
                  <dd>
                    {valueText(attribute, values[attribute.id])}
                    {!attribute.active && ' (inactive)'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
