import type { DragEvent } from 'react';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
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
    <section aria-labelledby="palette-title" className={styles.palette}>
      <h2 id="palette-title" className="visually-hidden">
        Widgets
      </h2>
      {GROUPS.map(({ group, title }) => (
        <div key={group} className={styles.typeGroup}>
          <h3 id={`palette-${group}`} className="visually-hidden">
            {title}
          </h3>
          <ul className={styles.typeList} role="list" aria-labelledby={`palette-${group}`}>
            {WIDGET_TYPES.filter((info) => info.group === group).map((info) => (
              <li key={info.type}>
                <Tooltip content={info.label}>
                  <button
                    type="button"
                    draggable
                    className={styles.typeButton}
                    aria-label={`Add ${info.label.toLowerCase()}`}
                    onClick={() => onAdd(info.type)}
                    onDragStart={(event) => handleDragStart(event, info.type)}
                  >
                    <info.icon size={18} aria-hidden="true" />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
