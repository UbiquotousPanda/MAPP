import { Fragment, useId, useState } from 'react';
import { cx } from '../cx';
import { FilterMenuButton } from '../FilterMenuButton/FilterMenuButton';
import { Popover } from '../Popover/Popover';
import styles from './FilterMenu.module.css';

export interface FilterChoice {
  value: string;
  label: string;
  inactive?: boolean;
  group?: string;
}

export interface FilterMenuProps {
  label: string;
  choices: FilterChoice[];
  selected: string[];
  multiple: boolean;
  onChange: (values: string[]) => void;
  /** After the name while in use: how many are chosen ("2") or the one chosen ("2026"). */
  summary?: string;
  quickChoice?: { label: string; values: string[] };
}

const SEARCHABLE_FROM = 10;

/** One filter of a filter bar (design system §5.2); a change applies at once. */
export function FilterMenu({
  label,
  choices,
  selected,
  multiple,
  onChange,
  summary,
  quickChoice,
}: FilterMenuProps) {
  const id = useId();
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  // A value chosen earlier that is no longer offered stays in the list, so it can be removed.
  const all: FilterChoice[] = [
    ...choices,
    ...selected
      .filter((value) => !choices.some((choice) => choice.value === value))
      .map((value) => ({ value, label: value })),
  ];
  const shown = needle ? all.filter((choice) => choice.label.toLowerCase().includes(needle)) : all;
  const quickTicked =
    quickChoice !== undefined &&
    quickChoice.values.length > 0 &&
    quickChoice.values.every((value) => selected.includes(value));

  function toggle(value: string, ticked: boolean) {
    if (!multiple) {
      onChange([value]);
      return;
    }
    onChange(ticked ? [...selected, value] : selected.filter((chosen) => chosen !== value));
  }

  function toggleQuick(ticked: boolean) {
    if (!quickChoice) return;
    const others = selected.filter((value) => !quickChoice.values.includes(value));
    onChange(ticked ? [...quickChoice.values, ...others] : others);
  }

  return (
    <Popover.Root onOpenChange={() => setSearch('')}>
      <Popover.Trigger asChild>
        <FilterMenuButton label={label} summary={summary} />
      </Popover.Trigger>
      <Popover.Content width="md" aria-label={label}>
        {all.length > SEARCHABLE_FROM && (
          <div className={styles.search}>
            <label htmlFor={`${id}-search`} className="visually-hidden">
              Search filters
            </label>
            <input
              id={`${id}-search`}
              type="search"
              placeholder="Search filters"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        )}
        <fieldset className={styles.choices}>
          <legend className="visually-hidden">{label}</legend>
          {quickChoice && !needle && (
            <label className={cx(styles.choice, styles.quick)}>
              <input
                type="checkbox"
                checked={quickTicked}
                onChange={(event) => toggleQuick(event.target.checked)}
              />
              {quickChoice.label}
            </label>
          )}
          {shown.length === 0 && <p className={styles.nothing}>Nothing to choose from.</p>}
          {shown.map((choice, index) => {
            const startsGroup =
              choice.group !== undefined && shown[index - 1]?.group !== choice.group;
            return (
              <Fragment key={choice.value}>
                {startsGroup && <p className={styles.group}>{choice.group}</p>}
                <label className={styles.choice}>
                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    name={multiple ? undefined : `${id}-choice`}
                    checked={selected.includes(choice.value)}
                    onChange={(event) => toggle(choice.value, event.target.checked)}
                  />
                  {choice.label}
                  {choice.inactive && ' (inactive)'}
                </label>
              </Fragment>
            );
          })}
        </fieldset>
      </Popover.Content>
    </Popover.Root>
  );
}
