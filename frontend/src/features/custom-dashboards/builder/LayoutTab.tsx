import { useState } from 'react';
import { InlineError } from '@/ui/InlineError/InlineError';
import type { Widget, WidgetLayout } from '../model';
import { placeMessage } from './announcements';
import { blockedBy } from './grid';
import { NumberInput } from './NumberInput';
import styles from './Inspector.module.css';

export interface LayoutTabProps {
  widget: Widget;
  widgets: readonly Widget[];
  onPlace: (layout: WidgetLayout) => void;
}

const PARTS = [
  { key: 'x', label: 'Column', offset: 1, min: 1, max: 12 },
  { key: 'y', label: 'Row', offset: 1, min: 1, max: 200 },
  { key: 'w', label: 'Width (columns)', offset: 0, min: 2, max: 12 },
  { key: 'h', label: 'Height (rows)', offset: 0, min: 2, max: 12 },
] as const;

interface Attempt {
  from: WidgetLayout;
  layout: WidgetLayout;
}

export function LayoutTab({ widget, widgets, onPlace }: LayoutTabProps) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const typed = attempt && sameLayout(attempt.from, widget.layout) ? attempt.layout : null;
  const shown = typed ?? widget.layout;
  const blocked = typed && blockedBy(typed, widgets, widget.id);

  function change(key: keyof WidgetLayout, value: number, offset: number) {
    const next = { ...shown, [key]: value - offset };
    if (blockedBy(next, widgets, widget.id) === null) {
      setAttempt(null);
      onPlace(next);
    } else {
      setAttempt({ from: widget.layout, layout: next });
    }
  }

  return (
    <div className={styles.tab}>
      {PARTS.map(({ key, label, offset, min, max }) => (
        <NumberInput
          key={key}
          label={label}
          name={`inspector-${widget.id}-layout-${key}`}
          min={min}
          max={max}
          value={shown[key] + offset}
          onChange={(value) => change(key, value, offset)}
        />
      ))}
      {blocked && (
        <InlineError>
          {placeMessage({
            blocked,
            resizing: typed.x === widget.layout.x && typed.y === widget.layout.y,
            layout: typed,
          })}
        </InlineError>
      )}
    </div>
  );
}

function sameLayout(a: WidgetLayout, b: WidgetLayout): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
