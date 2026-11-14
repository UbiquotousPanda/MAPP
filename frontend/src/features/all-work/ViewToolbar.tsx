import { ChevronsDownUp, ChevronsUpDown, Columns3, RotateCw } from 'lucide-react';
import { Button } from '@/ui/Button/Button';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { cx } from '@/ui/cx';
import { formatTime } from '@/format/intl';
import { COMPARE_PHASED, PERIOD_LABELS } from './all-work-text';
import type { ViewState } from './all-work-types';
import { Switch } from './Switch';
import styles from './ViewToolbar.module.css';

export interface ViewToolbarProps {
  state: ViewState;
  /** When the data on screen was read ("Updated at 14:05"); undefined while loading. */
  generatedAt: string | undefined;
  onChange: (next: ViewState) => void;
  onColumns: () => void;
  onRefresh: () => void;
}

/**
 * One order in every view (plan "Page layout"). Below 600 px the buttons show icons only (names stay), so
 * the data starts higher; while Budget & cost's card is too narrow for one row, the Unassigned switch shows
 * its short words and the time is read out but not shown.
 */
export function ViewToolbar({
  state,
  generatedAt,
  onChange,
  onColumns,
  onRefresh,
}: ViewToolbarProps) {
  const tree = state.view !== 'calendar';
  const allOpen = state.expansion.mode === 'allExpanded' && state.expansion.toggled.length === 0;

  return (
    <div className={cx(styles.toolbar, state.view === 'budget' && styles.crowded)}>
      <div className={styles.group}>
        {state.view === 'calendar' && (
          <SegmentedFilter
            label="Calendar layout"
            options={[
              { value: 'timeline', label: 'Timeline' },
              { value: 'month', label: 'Month' },
            ]}
            value={state.calendarLayout}
            onChange={(calendarLayout) => onChange({ ...state, calendarLayout })}
          />
        )}
        {state.view === 'budget' && (
          <SegmentedFilter
            label="Period"
            options={[
              { value: 'month', label: PERIOD_LABELS.month },
              { value: 'quarter', label: PERIOD_LABELS.quarter },
              { value: 'year', label: PERIOD_LABELS.year },
            ]}
            value={state.period}
            onChange={(period) => onChange({ ...state, period })}
          />
        )}
        {tree && (
          <>
            <Button
              size="sm"
              icon={allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
              onClick={() =>
                onChange({
                  ...state,
                  expansion: { mode: allOpen ? 'allCollapsed' : 'allExpanded', toggled: [] },
                })
              }
            >
              <span className={styles.label}>{allOpen ? 'Collapse all' : 'Expand all'}</span>
            </Button>
            <Switch
              label="Unassigned planned cost"
              shortLabel="Unassigned"
              checked={state.showUnassigned}
              onChange={(showUnassigned) => onChange({ ...state, showUnassigned })}
            />
          </>
        )}
        {state.view === 'budget' && (
          <Switch
            label={COMPARE_PHASED}
            shortLabel="Compare"
            shortOn="phone"
            checked={Boolean(state.comparePhased)}
            onChange={(comparePhased) => onChange({ ...state, comparePhased })}
          />
        )}
      </div>
      <div className={styles.end}>
        {state.view === 'grid' && (
          <Button size="sm" icon={<Columns3 />} onClick={onColumns}>
            <span className={styles.label}>Columns</span>
          </Button>
        )}
        {generatedAt && (
          <span className={styles.updated}>Updated at {formatTime(generatedAt)}</span>
        )}
        <Button size="sm" icon={<RotateCw />} onClick={onRefresh}>
          <span className={styles.label}>Refresh</span>
        </Button>
      </div>
    </div>
  );
}
