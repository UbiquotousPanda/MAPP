import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/ui/Button/Button';
import { Tabs } from '@/ui/Tabs/Tabs';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import { useDataSources } from '../charts';
import type { Widget } from '../model';
import type { BuilderAction, Draft } from './builder-reducer';
import { DashboardDetails } from './DashboardDetails';
import { DataTab } from './DataTab';
import { LayoutTab } from './LayoutTab';
import { PanelToggle } from './PanelToggle';
import { StyleTab } from './StyleTab';
import type { Problem } from './validate';
import { problemAt } from './validate';
import { widgetName } from './widget-defaults';
import builder from './Builder.module.css';
import styles from './Inspector.module.css';

type Tab = 'data' | 'style' | 'layout';

export interface InspectorProps {
  draft: Draft;
  selected: Widget | null;
  problems: readonly Problem[];
  onAction: (action: BuilderAction) => void;
  onHide: () => void;
}

export function Inspector({ draft, selected, problems, onAction, onHide }: InspectorProps) {
  const hideButton = <PanelToggle name="settings" hidden={false} onToggle={onHide} />;
  return (
    <aside aria-label="Inspector" className={builder.panel}>
      {selected ? (
        <WidgetInspector
          key={selected.id}
          draft={draft}
          widget={selected}
          problems={problems}
          onAction={onAction}
          hideButton={hideButton}
        />
      ) : (
        <DashboardDetails
          draft={draft}
          errorAt={(path) => problemAt(problems, path)}
          onAction={onAction}
          hideButton={hideButton}
        />
      )}
    </aside>
  );
}

interface WidgetInspectorProps {
  draft: Draft;
  widget: Widget;
  problems: readonly Problem[];
  onAction: (action: BuilderAction) => void;
  hideButton: ReactNode;
}

function WidgetInspector({ draft, widget, problems, onAction, hideButton }: WidgetInspectorProps) {
  const { id, query } = widget;
  const [tab, setTab] = useState<Tab>(query ? 'data' : 'style');
  const sources = useDataSources();
  const index = draft.widgets.findIndex((each) => each.id === id);
  const errorAt = (path: string) => problemAt(problems, `widgets[${index}].${path}`);
  const tabs = [
    ...(query ? [{ value: 'data' as const, label: 'Data' }] : []),
    { value: 'style' as const, label: 'Style' },
    { value: 'layout' as const, label: 'Layout' },
  ];

  return (
    <>
      <div className={styles.group}>
        <div className={builder.panelHeader}>
          <SectionHeading level={2} rank="card">
            {widgetName(widget)}
          </SectionHeading>
          {hideButton}
        </div>
        <Button
          size="sm"
          variant="tertiary"
          className={styles.back}
          onClick={() => onAction({ type: 'select', id: null })}
        >
          Dashboard details
        </Button>
      </div>
      <Tabs label={`Settings of '${widgetName(widget)}'`} tabs={tabs} value={tab} onChange={setTab}>
        {tab === 'data' && query && (
          <DataTab
            widget={widget}
            query={query}
            sources={sources.data}
            sourcesFailed={sources.isError}
            errorAt={errorAt}
            onQuery={(next, typing, removedMeasure) =>
              onAction({ type: 'setQuery', id, query: next, typing, removedMeasure })
            }
          />
        )}
        {tab === 'style' && (
          <StyleTab
            widget={widget}
            errorAt={errorAt}
            onDisplay={(display, typing) => onAction({ type: 'setDisplay', id, display, typing })}
            onText={(patch) => onAction({ type: 'setText', id, patch })}
          />
        )}
        {tab === 'layout' && (
          <LayoutTab
            key={widget.id}
            widget={widget}
            widgets={draft.widgets}
            onPlace={(layout) => onAction({ type: 'place', id, layout })}
          />
        )}
      </Tabs>
    </>
  );
}
