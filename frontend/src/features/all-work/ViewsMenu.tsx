import { Bookmark } from 'lucide-react';
import { Button } from '@/ui/Button/Button';
import { Menu } from '@/ui/Menu/Menu';
import type { SavedView } from './all-work-types';
import styles from './ViewsMenu.module.css';

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

export function ViewsMenu({
  views,
  active,
  modified,
  onApply,
  onSave,
  onUpdate,
  onSaveAsNew,
  onManage,
  onStandard,
}: ViewsMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button icon={<Bookmark />}>
          {active ? `View: ${active.name}` : 'Saved views'}
          {modified && ' '}
          {modified && <span className={styles.modified}>Modified</span>}
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        {views && views.length === 0 && (
          <Menu.Note>
            No saved views yet — set up filters and columns, then choose Save current view.
          </Menu.Note>
        )}
        {views?.map((view) => (
          <Menu.Choice
            key={view.id}
            checked={view.id === active?.id}
            onChoose={() => onApply(view)}
          >
            <span className={styles.name}>{view.name}</span>
            {view.isDefault && <span className={styles.default}>Default</span>}
          </Menu.Choice>
        ))}
        {views && views.length > 0 && <Menu.Separator />}
        <Menu.Item onChoose={onSave}>Save current view…</Menu.Item>
        {active && modified && (
          <>
            <Menu.Item onChoose={onUpdate}>Update view</Menu.Item>
            <Menu.Item onChoose={onSaveAsNew}>Save as new view…</Menu.Item>
          </>
        )}
        {views && views.length > 0 && <Menu.Item onChoose={onManage}>Manage views…</Menu.Item>}
        <Menu.Item onChoose={onStandard}>Standard view</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
