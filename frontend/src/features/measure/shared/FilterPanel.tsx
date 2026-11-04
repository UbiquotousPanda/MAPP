import { useEffect, useId, useRef, useState } from 'react';
import { Switch } from '@/features/all-work';
import { Button } from '@/ui/Button/Button';
import type { ReportChoices } from './api';
import {
  addressOf,
  draftKey,
  draftOf,
  emptyGroups,
  LIST_KEYS,
  optionsOf,
  TITLES,
  yearNote,
} from './filter-draft';
import type { Draft } from './filter-draft';
import type { Ticked } from './filter-keys';
import { FilterGroup } from './FilterGroup';
import { LevelTabs } from './LevelTabs';
import { LIVE_DELAY_MS, LIVE_LABEL, useLiveFilters } from './live-filters';
import type { ReportAddress } from './report-address';
import { NOT_APPLIED } from './report-text';
import styles from './ReportFrame.module.css';

interface FilterPanelProps {
  choices: ReportChoices;
  applied: ReportAddress;
  year: number;
  /** True while the report is loading what was applied. */
  busy?: boolean;
  onApply: (next: ReportAddress) => void;
}

/**
 * The report's filters in the order 039 lists them. They take effect on Apply, or — with
 * "Update as I choose" on — a moment after the last change; the year applies at once either way.
 */
export function FilterPanel({ choices, applied, year, busy = false, onApply }: FilterPanelProps) {
  const initial = draftOf(applied, year);
  const appliedKey = draftKey(initial);
  const [draft, setDraft] = useState<Draft>(initial);
  const [seen, setSeen] = useState(appliedKey);
  const [sent, setSent] = useState<string | null>(null);
  const [live, setLive] = useLiveFilters();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  if (seen !== appliedKey) {
    // The applied filters changed outside the panel (a chip, Reset filters, a view): a new draft.
    setSeen(appliedKey);
    setDraft(initial);
    setSent(null);
  }
  const current = draftKey(draft);
  const pending = current !== appliedKey;
  const empty = emptyGroups(draft, choices);
  const hint = empty.length > 0 ? `Tick at least one value in ${empty.join(', ')}.` : null;
  const options = optionsOf(choices);
  const restricted = Object.values(initial.ticked).filter((t) => t !== null).length;
  const change = (changes: Record<string, Ticked>) =>
    setDraft((d) => ({ ...d, ticked: { ...d.ticked, ...changes } }));

  function apply() {
    onApply(addressOf(draft, applied, choices));
    setSent(current);
    if (!live) {
      setOpen(false);
    }
  }

  // Escape closes the collapsed panel without changing anything.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDraft(draftOf(applied, year));
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, applied, year]);

  // Live: a burst of changes becomes one request a moment after the last one; a draft already sent waits for the report.
  useEffect(() => {
    if (!live || !pending || hint !== null || current === sent) {
      return undefined;
    }
    const timer = setTimeout(apply, LIVE_DELAY_MS);
    return () => clearTimeout(timer);
  });

  return (
    <aside className={styles.filters} aria-label="Filters">
      <Button
        ref={toggle}
        type="button"
        variant="secondary"
        className={styles.filtersToggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        Filters ({restricted})
      </Button>
      <div id={panelId} className={open ? styles.panelOpen : styles.panel}>
        <div className={styles.liveSwitch}>
          <Switch label={LIVE_LABEL} checked={live} onChange={setLive} />
        </div>
        <label className={styles.field}>
          Year
          <select
            className={styles.select}
            value={draft.year}
            aria-describedby={applied.plans.length > 0 ? `${panelId}-year` : undefined}
            onChange={(e) => onApply({ ...applied, year: Number(e.target.value), plans: [] })}
          >
            {choices.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {applied.plans.length > 0 && (
          <p id={`${panelId}-year`} className={styles.pending}>
            {yearNote(applied.plans.length)}
          </p>
        )}
        {LIST_KEYS.map((key) => (
          <FilterGroup
            key={key}
            title={TITLES[key]}
            options={options[key]}
            ticked={draft.ticked[key] ?? null}
            onChange={(next) => change({ [key]: next })}
          />
        ))}
        <LevelTabs groups={choices.attributeGroups} ticked={draft.ticked} onChange={change} />
        <div className={styles.applyBar}>
          {live ? (
            <p className={styles.pending} role="status">
              {hint ?? (pending || busy ? 'Updating…' : 'Up to date')}
            </p>
          ) : (
            <>
              {pending && (
                <p className={styles.pending} role="status">
                  {NOT_APPLIED}
                </p>
              )}
              {hint && (
                <p className={styles.pending} role="status">
                  {hint}
                </p>
              )}
              <Button type="button" variant="secondary" onClick={apply} disabled={hint !== null}>
                Apply
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
