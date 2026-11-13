import type { ReactNode } from 'react';
import { Combobox } from '@/ui/Combobox/Combobox';
import { DateRangeField } from '@/ui/DateRangeField/DateRangeField';
import { FieldRow } from '@/ui/FieldRow/FieldRow';
import { TextAreaField } from '@/ui/TextAreaField/TextAreaField';
import { TextField } from '@/ui/TextField/TextField';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import type { CustomDashboardFilters } from '../model';
import { usePlanChoices, useTeamChoices } from './api';
import type { Choice } from './api';
import type { BuilderAction, Draft } from './builder-reducer';
import { NAME_FIELD_ID } from './canvas-dom';
import builder from './Builder.module.css';
import styles from './Inspector.module.css';

export interface DashboardDetailsProps {
  draft: Draft;
  errorAt: (path: string) => string | undefined;
  onAction: (action: BuilderAction) => void;
  hideButton: ReactNode;
}

export function DashboardDetails({ draft, errorAt, onAction, hideButton }: DashboardDetailsProps) {
  const plans = usePlanChoices();
  const teams = useTeamChoices();
  const { filters } = draft;
  const setFilters = (patch: Partial<CustomDashboardFilters>) =>
    onAction({ type: 'setFilters', filters: { ...filters, ...patch } });
  const teamChoices: Choice[] | undefined = teams.data
    ?.filter((team) => team.active)
    .map((team) => ({ id: team.id, label: team.name }));

  return (
    <div className={styles.tab}>
      <div className={builder.panelHeader}>
        <SectionHeading level={2} rank="card">
          Dashboard
        </SectionHeading>
        {hideButton}
      </div>
      <TextField
        label="Name"
        name={NAME_FIELD_ID}
        marking="Required"
        maxLength={80}
        value={draft.name}
        onChange={(name) => onAction({ type: 'rename', name })}
        error={errorAt('name')}
      />
      <TextAreaField
        label="Description"
        name="dashboard-description"
        maxLength={500}
        rows={3}
        value={draft.description}
        onChange={(description) => onAction({ type: 'describe', description })}
        error={errorAt('description')}
      />
      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          <SectionHeading level={3} rank="sub">
            Default filters
          </SectionHeading>
        </legend>
        <p className={styles.note}>
          Viewers start with these. They apply to SP&A One data, never to uploaded data.
        </p>
        <DateRangeField
          label="Dates"
          idPrefix="dashboard-filters"
          start={filters.dateFrom ?? ''}
          end={filters.dateTo ?? ''}
          onChange={({ start, end }) =>
            setFilters({ dateFrom: start || null, dateTo: end || null })
          }
          errors={{ end: errorAt('filters.dateTo') }}
        />
        <FieldRow>
          <ChoicesField
            label="Plans"
            name="dashboard-filter-plans"
            choices={plans.data}
            value={filters.planIds}
            error={errorAt('filters.planIds')}
            onChange={(planIds) => setFilters({ planIds })}
          />
          <ChoicesField
            label="Teams"
            name="dashboard-filter-teams"
            choices={teamChoices}
            value={filters.teamIds}
            error={errorAt('filters.teamIds')}
            onChange={(teamIds) => setFilters({ teamIds })}
          />
        </FieldRow>
      </fieldset>
    </div>
  );
}

interface ChoicesFieldProps {
  label: string;
  name: string;
  choices: Choice[] | undefined;
  value: string[];
  error: string | undefined;
  onChange: (ids: string[]) => void;
}

function ChoicesField({ label, name, choices, value, error, onChange }: ChoicesFieldProps) {
  const noun = label.toLowerCase();
  return (
    <Combobox
      label={label}
      name={name}
      multiple
      tip="Empty: all you may see."
      options={choices ?? []}
      value={value}
      onChange={onChange}
      error={error}
      renderChip={(id) => ({
        label: choices
          ? (choices.find((choice) => choice.id === id)?.label ?? `${id} (deleted)`)
          : id,
      })}
      placeholder={`Search ${noun}`}
      countText={(count) => `${count} ${count === 1 ? noun.slice(0, -1) : noun}`}
      noMatchText={(query) => `Nothing matches '${query}'.`}
    />
  );
}
