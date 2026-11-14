import { Select } from '@/ui/Select/Select';
import type { PlanningDashboard } from './api';
import type { DashboardFilters as Filters, DashboardKind, PlanType } from './dashboard-links';
import { PLAN_TYPES } from './dashboard-text';
import styles from './Dashboards.module.css';

interface DashboardFiltersProps {
  kind: DashboardKind;
  dashboard: PlanningDashboard;
  onChange: (patch: Partial<Filters>) => void;
}

const PLAN_TYPE_OPTIONS = [{ value: '', label: 'All plan types' }, ...PLAN_TYPES];

export function DashboardFilters({ kind, dashboard, onChange }: DashboardFiltersProps) {
  const { filters, choices } = dashboard;
  return (
    <div className={styles.filters} role="group" aria-label="Filters">
      <Select
        label="Year"
        value={String(filters.year)}
        options={choices.years.map((year) => ({ value: String(year), label: String(year) }))}
        onChange={(year) => onChange({ year: Number(year), plan: '' })}
      />
      {kind === 'regional' && (
        <Select
          label="Market"
          value={filters.teamId ?? ''}
          options={choices.teams.map((team) => ({
            value: team.id,
            label: team.active ? team.name : `${team.name} (inactive)`,
          }))}
          onChange={(team) => onChange({ team, plan: '' })}
        />
      )}
      <Select
        label="Plan type"
        value={filters.planType ?? ''}
        options={PLAN_TYPE_OPTIONS}
        onChange={(value) => onChange({ planType: planTypeOf(value), plan: '' })}
      />
    </div>
  );
}

function planTypeOf(value: string): PlanType | '' {
  return PLAN_TYPES.find((type) => type.value === value)?.value ?? '';
}
