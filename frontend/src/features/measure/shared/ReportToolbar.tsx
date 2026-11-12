import type { ReactNode } from 'react';
import { FilterBar } from '@/ui/FilterBar/FilterBar';
import type { ReportFrame as Frame } from './api';
import { resetFilters } from './report-address';
import type { ReportAddress } from './report-address';
import { chipsOf, withoutChip } from './report-text';
import { YearControl } from './ReportControls';
import { ReportFilters } from './ReportFilters';
import type { AddressUpdate } from './useReportAddress';

interface ReportToolbarProps {
  data: Frame;
  address: ReportAddress;
  onChange: (update: AddressUpdate) => void;
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

/** The list pattern of every page: Year · Filters (n) · the report's own controls; chips below. */
export function ReportToolbar(props: ReportToolbarProps) {
  const { data, address, onChange, controls } = props;
  const applied = appliedAddress(address, data);
  const chips = chipsOf(applied, data.choices);
  return (
    <FilterBar
      quick={
        <YearControl
          years={data.choices.years}
          value={data.filter.year}
          plansChosen={address.plans.length}
          onChange={(year) => onChange((latest) => ({ ...latest, year, plans: [] }))}
        />
      }
      inUse={chips.length}
      menus={<ReportFilters choices={data.choices} applied={applied} onApply={onChange} />}
      end={controls}
      chips={chips}
      onRemoveChip={(key) => onChange((latest) => withoutChip(latest, key))}
      onClearFilters={() => onChange(resetFilters)}
    />
  );
}
