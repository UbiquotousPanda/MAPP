import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../cx';
import { FilterChips } from '../FilterChips/FilterChips';
import type { FilterChip } from '../FilterChips/FilterChips';
import { FiltersButton } from '../FilterMenuButton/FilterMenuButton';
import styles from './FilterBar.module.css';

export interface FilterBarProps {
  search?: ReactNode;
  /** The page's one quick control, always shown: a status `SegmentedFilter` or the Year. */
  quick?: ReactNode;
  menus?: ReactNode;
  /** How many filters behind the button are in use; the fold opens by itself when any come into use. */
  inUse?: number;
  end?: ReactNode;
  chips?: FilterChip[];
  onRemoveChip?: (key: string) => void;
  onClearFilters?: () => void;
  note?: ReactNode;
  className?: string;
}

/** The one list toolbar (design system §5.2): search · quick control · Filters (n) · count. */
export function FilterBar(props: FilterBarProps) {
  const { search, quick, menus, inUse = 0, end, chips = [], onRemoveChip, onClearFilters } = props;
  const menusId = useId();
  const [open, setOpen] = useState(inUse > 0);
  const [wasInUse, setWasInUse] = useState(inUse > 0);
  // Filters set from elsewhere (a link, Back) fold out the menus too, so their buttons show.
  if (inUse > 0 !== wasInUse) {
    setWasInUse(inUse > 0);
    if (inUse > 0) {
      setOpen(true);
    }
  }
  return (
    <div className={cx(styles.bar, props.className)}>
      <div className={styles.top}>
        {search && <div className={styles.search}>{search}</div>}
        {quick && <div className={styles.quick}>{quick}</div>}
        {menus && (
          <FiltersButton
            count={inUse}
            aria-expanded={open}
            aria-controls={menusId}
            onClick={() => setOpen(!open)}
          />
        )}
        {end && <div className={styles.end}>{end}</div>}
      </div>
      {menus && (
        <div id={menusId} className={styles.menus} role="group" aria-label="Filters" hidden={!open}>
          {menus}
        </div>
      )}
      {(chips.length > 0 || props.note) && (
        <div className={styles.chips}>
          <FilterChips
            chips={chips}
            onRemove={(key) => onRemoveChip?.(key)}
            onClearAll={onClearFilters}
          />
          {props.note}
        </div>
      )}
    </div>
  );
}
