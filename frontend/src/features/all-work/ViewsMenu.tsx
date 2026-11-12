import { SavedViewsMenu } from '@/ui/SavedViewsMenu/SavedViewsMenu';
import type { SavedView } from './all-work-types';

export interface ViewsMenuProps {
  /** The person's saved views, by name; undefined while they load. */
  views: SavedView[] | undefined;
  active: SavedView | null;
  modified: boolean;
  onApply: (view: SavedView) => void;
  onSave: () => void;
  onUpdate: () => void;
  onSaveAsNew: () => void;
  onManage: () => void;
  onStandard: () => void;
}

export function ViewsMenu({ views, active, modified, ...on }: ViewsMenuProps) {
  const actions = [
    { label: 'Save current view…', onChoose: on.onSave },
    ...(active && modified
      ? [
          { label: 'Update view', onChoose: on.onUpdate },
          { label: 'Save as new view…', onChoose: on.onSaveAsNew },
        ]
      : []),
    ...(views && views.length > 0 ? [{ label: 'Manage views…', onChoose: on.onManage }] : []),
    { label: 'Standard view', onChoose: on.onStandard },
  ];
  return (
    <SavedViewsMenu
      views={views}
      active={active}
      modified={modified}
      empty="No saved views yet — set up filters and columns, then choose Save current view."
      onApply={on.onApply}
      actions={actions}
    />
  );
}
