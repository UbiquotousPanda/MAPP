import type { DragEvent } from 'react';
import { cx } from '@/ui/cx';
import type { WidgetType } from '../model';
import { WIDGET_TYPES } from '../widget-types';
import type { WidgetTypeInfo } from '../widget-types';
import { WIDGET_MIME } from './canvas-dom';
import styles from './Builder.module.css';

const GROUPS: { group: WidgetTypeInfo['group']; title: string }[] = [
  { group: 'charts', title: 'Charts' },
  { group: 'figures', title: 'Figures and tables' },
  { group: 'text', title: 'Text' },
];

export interface WidgetPaletteProps {
  onAdd: (type: WidgetType) => void;
}

export function WidgetPalette({ onAdd }: WidgetPaletteProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>, type: WidgetType) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(WIDGET_MIME, type);
    event.dataTransfer.setData(`${WIDGET_MIME}-${type.toLowerCase()}`, '');
  }

  return (
    <section aria-labelledby="palette-title" className={cx(styles.panel, styles.palette)}>
      <h2 id="palette-title" className={styles.panelTitle}>
        Widgets
      </h2>
      {GROUPS.map(({ group, title }) => (
        <div key={group}>
          <h3 id={`palette-${group}`} className={styles.groupTitle}>
            {title}
          </h3>
          <ul className={styles.typeList} role="list" aria-labelledby={`palette-${group}`}>
            {WIDGET_TYPES.filter((info) => info.group === group).map((info) => (
              <li key={info.type}>
                <button
                  type="button"
                  draggable
                  className={styles.typeButton}
                  aria-label={`Add ${info.label.toLowerCase()}`}
                  title={info.label}
                  onClick={() => onAdd(info.type)}
                  onDragStart={(event) => handleDragStart(event, info.type)}
                >
                  <info.icon size={16} aria-hidden="true" />
                  <span className={styles.typeLabel}>{info.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
