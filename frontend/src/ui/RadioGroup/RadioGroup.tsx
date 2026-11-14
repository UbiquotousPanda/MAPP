import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../cx';
import { FieldShell } from '../FieldShell/FieldShell';
import type { FieldFrameProps } from '../FieldShell/FieldShell';
import { LockedNote } from '../LockedNote/LockedNote';
import styles from './RadioGroup.module.css';

export interface RadioOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** A second line under the label, heard with the option. */
  hint?: ReactNode;
  /** Lists the option under this heading, its own small group. */
  group?: string;
  /** Locks this one option and says why under it. */
  disabledReason?: string;
}

export interface RadioGroupProps<T extends string | number> extends FieldFrameProps {
  /** The radios' name and the group's id, so the form's problem summary can bring the focus here. */
  name: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Side by side for a few short choices; one under another; or bordered rows for long lists. */
  layout?: 'row' | 'column' | 'list';
  /** Locks the whole group and says why under it. */
  disabledReason?: string;
  note?: ReactNode;
  /** Shown under the choices inside the group, such as the team picker of "Chosen teams". */
  children?: ReactNode;
}

/** A small set of choices shown at once (design system §5.5), named by its legend. */
export function RadioGroup<T extends string | number>(props: RadioGroupProps<T>) {
  const {
    name,
    options,
    value,
    onChange,
    layout = 'column',
    disabledReason,
    note,
    children,
  } = props;
  const { label, marking, hint, tip, error, labelHidden } = props;
  const notes =
    disabledReason || note ? (
      <>
        {disabledReason && <LockedNote>{disabledReason}</LockedNote>}
        {note}
      </>
    ) : undefined;
  return (
    <FieldShell
      id={name}
      as="fieldset"
      {...{ label, marking, hint, tip, error, labelHidden }}
      note={notes}
    >
      {() => (
        <>
          {groupsOf(options).map(([group, items]) => {
            const radios = (
              <div className={cx(styles.options, styles[layout])}>
                {items.map((option) => (
                  <Radio
                    key={String(option.value)}
                    name={name}
                    option={option}
                    checked={option.value === value}
                    locked={Boolean(disabledReason)}
                    onChange={onChange}
                  />
                ))}
              </div>
            );
            return group === undefined ? (
              <Fragment key="">{radios}</Fragment>
            ) : (
              <fieldset key={group} className={styles.subgroup}>
                <legend className={styles.groupLegend}>{group}</legend>
                {radios}
              </fieldset>
            );
          })}
          {children}
        </>
      )}
    </FieldShell>
  );
}

interface RadioProps<T extends string | number> {
  name: string;
  option: RadioOption<T>;
  checked: boolean;
  locked: boolean;
  onChange: (value: T) => void;
}

function Radio<T extends string | number>({
  name,
  option,
  checked,
  locked,
  onChange,
}: RadioProps<T>) {
  const id = `${name}-${String(option.value)}`;
  const described = [option.hint && `${id}-hint`, option.disabledReason && `${id}-reason`]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={styles.option}>
      <label className={styles.radio}>
        <input
          type="radio"
          name={name}
          value={String(option.value)}
          checked={checked}
          disabled={locked || Boolean(option.disabledReason)}
          aria-describedby={described || undefined}
          onChange={() => onChange(option.value)}
        />
        {option.label}
      </label>
      {option.hint && (
        <div id={`${id}-hint`} className={styles.hint}>
          {option.hint}
        </div>
      )}
      {option.disabledReason && (
        <div className={styles.hint}>
          <LockedNote id={`${id}-reason`}>{option.disabledReason}</LockedNote>
        </div>
      )}
    </div>
  );
}

function groupsOf<T extends string | number>(options: RadioOption<T>[]) {
  const groups = [...new Set(options.map((option) => option.group))];
  return groups.map(
    (group) => [group, options.filter((option) => option.group === group)] as const,
  );
}
