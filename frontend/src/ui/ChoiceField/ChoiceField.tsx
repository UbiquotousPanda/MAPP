import type { ReactNode } from 'react';
import { formatWhole } from '@/format/decimal';
import { plural } from '@/format/text';
import { Checkbox } from '../CheckboxField/CheckboxField';
import { Combobox } from '../Combobox/Combobox';
import { FieldShell } from '../FieldShell/FieldShell';
import type { FieldFrameProps } from '../FieldShell/FieldShell';
import { SelectControl } from '../Select/Select';
import styles from './ChoiceField.module.css';

/** One choice. An inactive one is offered only while it is already chosen. */
export interface ChoiceOption {
  id: string;
  label: string;
  active?: boolean;
  group?: string;
}

interface ChoiceFieldBase extends FieldFrameProps {
  name: string;
  options: ChoiceOption[];
  /** Locks the field and says why under it ("Choose a cluster first."). */
  disabledReason?: string;
  note?: ReactNode;
  /** The select's empty first choice ("Choose…"); null for a field that always holds a value. */
  placeholder?: string | null;
}

export interface SingleChoiceFieldProps extends ChoiceFieldBase {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

export interface MultipleChoiceFieldProps extends ChoiceFieldBase {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type ChoiceFieldProps = SingleChoiceFieldProps | MultipleChoiceFieldProps;

const SEARCHABLE_ABOVE = 10;
const LIST_LIMIT = 50;

// Up to 10 options, or options under group headings: ui/Select starting "Choose…", or check boxes;
// more: a searchable Combobox showing at most 50 matches. Inactive options are offered only while
// chosen, as "<label> (inactive)".
export function ChoiceField(props: ChoiceFieldProps) {
  const { name, options, disabledReason, note, error, placeholder, ...frameAndValue } = props;
  const chosen = props.multiple ? props.value : props.value ? [props.value] : [];
  const offered = options
    .filter((option) => option.active !== false || chosen.includes(option.id))
    .map((option) => ({
      ...option,
      label: option.active === false ? `${option.label} (inactive)` : option.label,
    }));
  const frame = withoutValue(frameAndValue);

  const grouped = offered.some((option) => option.group !== undefined);
  if (offered.length > SEARCHABLE_ABOVE && !grouped) {
    return (
      <Combobox
        {...frame}
        name={name}
        error={error}
        options={offered}
        value={chosen.filter((id) => offered.some((option) => option.id === id))}
        onChange={(ids) =>
          props.multiple ? props.onChange(ids) : props.onChange(ids[ids.length - 1] ?? '')
        }
        multiple={props.multiple}
        placeholder="Type to search"
        countText={(count) => plural(count, 'option')}
        noMatchText={(query) => `No option matches '${query}'.`}
        limit={LIST_LIMIT}
        limitText={(shown, total) =>
          `Showing ${formatWhole(shown)} of ${formatWhole(total)} — keep typing to narrow down.`
        }
        disabledReason={disabledReason}
        note={note}
      />
    );
  }

  if (props.multiple) {
    const { value, onChange } = props;
    return (
      <FieldShell {...frame} id={name} as="fieldset" error={error} note={disabledReason ?? note}>
        {() => (
          <div className={styles.boxes}>
            {offered.map((option, index) => {
              const id = `${name}-${index}`;
              return (
                <div key={option.id} className={styles.box}>
                  <Checkbox
                    id={id}
                    checked={value.includes(option.id)}
                    disabled={Boolean(disabledReason)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...value, option.id]
                          : value.filter((chosenId) => chosenId !== option.id),
                      )
                    }
                  />
                  <label htmlFor={id}>{option.label}</label>
                </div>
              );
            })}
          </div>
        )}
      </FieldShell>
    );
  }

  return (
    <FieldShell {...frame} id={name} error={error} note={disabledReason ?? note}>
      {(describedBy, required) => (
        <SelectControl
          id={name}
          name={name}
          size="md"
          value={offered.some((option) => option.id === props.value) ? props.value : ''}
          options={[
            ...(placeholder === null ? [] : [{ value: '', label: placeholder ?? 'Choose…' }]),
            ...offered.map((option) => ({
              value: option.id,
              label: option.label,
              group: option.group,
            })),
          ]}
          onChange={props.onChange}
          disabled={Boolean(disabledReason)}
          invalid={Boolean(error)}
          describedBy={describedBy}
          required={required}
        />
      )}
    </FieldShell>
  );
}

function withoutValue(
  props: Omit<
    ChoiceFieldProps,
    'name' | 'options' | 'disabledReason' | 'note' | 'error' | 'placeholder'
  >,
): FieldFrameProps {
  const { label, marking, hint, tip, labelHidden } = props;
  return { label, marking, hint, tip, labelHidden };
}
