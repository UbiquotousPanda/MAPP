import { Fragment, useState } from 'react';
import { formatWhole } from '@/format/decimal';
import { Checkbox } from '../CheckboxField/CheckboxField';
import { cx } from '../cx';
import menu from '../FilterMenu/FilterMenu.module.css';
import { FilterMenuButton } from '../FilterMenuButton/FilterMenuButton';
import { Popover } from '../Popover/Popover';
import { SearchField } from '../SearchField/SearchField';
import type { AttributeGroup, AttributeSelection } from './attribute-filter';
import {
  LEVEL_LABELS,
  NOT_FILLED_IN,
  NOT_FILLED_IN_LABEL,
  withAttributeValues,
} from './attribute-filter';
import styles from './AttributeFilterMenu.module.css';

const MORE_FILTERS = 'More filters';
const SEARCH_ATTRIBUTES = 'Search attributes and values';

export interface AttributeFilterMenuProps {
  /** The filterable Shell attributes, level by level in Settings' order. */
  attributes: AttributeGroup[];
  selected: AttributeSelection[];
  onChange: (filters: AttributeSelection[]) => void;
}

interface Shown {
  attribute: AttributeGroup;
  choices: { value: string; label: string }[];
}

/**
 * **More filters**: every Shell attribute grouped by level, its values and Not filled in as check
 * boxes, searchable by attribute or value. A change applies at once, like the other filters.
 */
export function AttributeFilterMenu({ attributes, selected, onChange }: AttributeFilterMenuProps) {
  const [search, setSearch] = useState('');
  const shown = matching(attributes, search.trim().toLowerCase());
  const inUse = selected.filter((filter) => filter.values.length > 0).length;

  return (
    <Popover.Root onOpenChange={() => setSearch('')}>
      <Popover.Trigger asChild>
        <FilterMenuButton
          label={MORE_FILTERS}
          summary={inUse > 0 ? formatWhole(inUse) : undefined}
        />
      </Popover.Trigger>
      <Popover.Content width="lg" aria-label={MORE_FILTERS}>
        <div className={styles.search}>
          <SearchField
            label={SEARCH_ATTRIBUTES}
            placeholder={SEARCH_ATTRIBUTES}
            value={search}
            onChange={setSearch}
          />
        </div>
        {shown.length === 0 && <p className={menu.nothing}>Nothing to choose from.</p>}
        {shown.map(({ attribute, choices }, index) => (
          <Fragment key={attribute.id}>
            {shown[index - 1]?.attribute.level !== attribute.level && (
              <p className={menu.group}>{LEVEL_LABELS[attribute.level] ?? attribute.level}</p>
            )}
            <AttributeChoices
              label={attribute.label}
              choices={choices}
              values={selected.find((f) => f.attributeId === attribute.id)?.values ?? []}
              onChange={(values) => onChange(withAttributeValues(selected, attribute.id, values))}
            />
          </Fragment>
        ))}
      </Popover.Content>
    </Popover.Root>
  );
}

interface AttributeChoicesProps {
  label: string;
  choices: Shown['choices'];
  values: string[];
  onChange: (values: string[]) => void;
}

function AttributeChoices({ label, choices, values, onChange }: AttributeChoicesProps) {
  return (
    <fieldset className={cx(menu.choices, styles.attribute)}>
      <legend className={styles.legend}>{label}</legend>
      {choices.map((choice) => (
        <label key={choice.value} className={menu.choice}>
          <Checkbox
            checked={values.includes(choice.value)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...values, choice.value]
                  : values.filter((value) => value !== choice.value),
              )
            }
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  );
}

function matching(attributes: AttributeGroup[], needle: string): Shown[] {
  return attributes.flatMap((attribute) => {
    const all = [
      ...attribute.values.map((option) => ({
        value: option.id,
        label: option.inactive ? `${option.label} (inactive)` : option.label,
      })),
      { value: NOT_FILLED_IN, label: NOT_FILLED_IN_LABEL },
    ];
    const named = attribute.label.toLowerCase().includes(needle);
    const choices = named ? all : all.filter((c) => c.label.toLowerCase().includes(needle));
    return choices.length > 0 ? [{ attribute, choices }] : [];
  });
}
