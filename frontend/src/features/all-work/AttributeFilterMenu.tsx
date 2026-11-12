import { Fragment, useId, useState } from 'react';
import { formatWhole } from '@/format/decimal';
import { cx } from '@/ui/cx';
import { FilterMenuButton } from '@/ui/FilterMenuButton/FilterMenuButton';
import menu from '@/ui/FilterMenu/FilterMenu.module.css';
import { Popover } from '@/ui/Popover/Popover';
import type { AttributeFilter, FilterableAttribute } from './all-work-types';
import { NOT_FILLED_IN, NOT_FILLED_IN_LABEL, withAttributeValues } from './attribute-filters';
import styles from './AttributeFilterMenu.module.css';
import { LEVEL_LABELS, MORE_FILTERS, NOTHING_TO_CHOOSE, SEARCH_ATTRIBUTES } from './breakdown-text';

export interface AttributeFilterMenuProps {
  /** The filterable Shell attributes, level by level in Settings' order. */
  attributes: FilterableAttribute[];
  selected: AttributeFilter[];
  onChange: (filters: AttributeFilter[]) => void;
}

interface Shown {
  attribute: FilterableAttribute;
  choices: { value: string; label: string }[];
}

/**
 * **More filters**: every Shell attribute grouped by level, its values and Not filled in as check
 * boxes, searchable by attribute or value. A change applies at once, like the other filters.
 */
export function AttributeFilterMenu({ attributes, selected, onChange }: AttributeFilterMenuProps) {
  const id = useId();
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
        <div className={menu.search}>
          <label htmlFor={`${id}-search`} className="visually-hidden">
            {SEARCH_ATTRIBUTES}
          </label>
          <input
            id={`${id}-search`}
            type="search"
            placeholder={SEARCH_ATTRIBUTES}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {shown.length === 0 && <p className={menu.nothing}>{NOTHING_TO_CHOOSE}</p>}
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
          <input
            type="checkbox"
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

function matching(attributes: FilterableAttribute[], needle: string): Shown[] {
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
