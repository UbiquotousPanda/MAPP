import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/ui/Button/Button';
import { FilterChips } from '@/ui/FilterChips/FilterChips';
import { FiltersButton } from '@/ui/FilterMenuButton/FilterMenuButton';
import type { ReportFrame as Frame } from './api';
import { isRestricted, resetFilters } from './report-address';
import type { ReportAddress } from './report-address';
import { chipsOf, withoutChip } from './report-text';
import { YearControl } from './ReportControls';
import { ReportFilters } from './ReportFilters';
import styles from './ReportFrame.module.css';

interface ReportToolbarProps {
  data: Frame;
  address: ReportAddress;
  onChange: (next: ReportAddress) => void;
  controls?: ReactNode;
}

/** The address as the frame applied it: the resolved year, left-out values dropped. */
function appliedAddress(address: ReportAddress, frame: Frame): ReportAddress {
  const f = frame.filter;
  return {
    ...address,
    year: f.year,
    plans: f.plans,
    teams: f.teams,
    owners: f.owners,
    activityTypes: f.activityTypes,
  };
}

/** As on All work: Filters (n) folds the filter buttons away; the chips say what is in use. */
export function ReportToolbar(props: ReportToolbarProps) {
  const { data, address, onChange, controls } = props;
  const [open, setOpen] = useState(false);
  const menusId = useId();
  const applied = appliedAddress(address, data);
  const chips = chipsOf(applied, data.choices);
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        <FiltersButton
          size="sm"
          count={chips.length}
          aria-expanded={open}
          aria-controls={menusId}
          onClick={() => setOpen(!open)}
        />
        <YearControl
          years={data.choices.years}
          value={data.filter.year}
          plansChosen={address.plans.length}
          onChange={(year) => onChange({ ...address, year, plans: [] })}
        />
        {controls}
      </div>
      <div id={menusId} className={styles.menus} role="group" aria-label="Filters" hidden={!open}>
        <ReportFilters choices={data.choices} applied={applied} onApply={onChange} />
      </div>
      {chips.length > 0 && (
        <div className={styles.chipsRow}>
          <FilterChips chips={chips} onRemove={(key) => onChange(withoutChip(address, key))} />
          {isRestricted(address) && (
            <Button
              type="button"
              size="sm"
              variant="tertiary"
              onClick={() => onChange(resetFilters(address))}
            >
              Reset filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
