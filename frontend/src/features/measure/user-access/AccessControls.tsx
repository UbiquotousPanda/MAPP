import { SearchField } from '@/ui/SearchField/SearchField';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { Select } from '@/ui/Select/Select';
import type { TeamRef } from './api';
import type { AccessStatus, AccessTable } from './access-address';
import styles from './UserAccess.module.css';

interface AccessControlsProps {
  table: AccessTable;
  teams: TeamRef[];
  onChange: (patch: Partial<AccessTable>) => void;
}

/** Search, Team and Status, the report's own controls instead of the plan filters (045-C1). */
export function AccessControls({ table, teams, onChange }: AccessControlsProps) {
  return (
    <div className={styles.controls}>
      <SearchField
        label="Search people"
        placeholder="Search name, e-mail, job title, role or team"
        value={table.q}
        onChange={(q) => onChange({ q })}
      />
      <Select
        label="Team"
        value={table.teams[0] ?? ''}
        options={[
          { value: '', label: 'All teams' },
          ...teams.filter((t) => t.active).map((t) => ({ value: t.id, label: t.name })),
        ]}
        onChange={(team) => onChange({ teams: team ? [team] : [] })}
      />
      <div className={styles.field}>
        <span aria-hidden="true">Status</span>
        <SegmentedFilter<AccessStatus>
          label="Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'all', label: 'All' },
          ]}
          value={table.status}
          onChange={(status) => onChange({ status })}
        />
      </div>
    </div>
  );
}
