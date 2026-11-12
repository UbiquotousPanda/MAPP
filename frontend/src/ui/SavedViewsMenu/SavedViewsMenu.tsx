import { Bookmark } from 'lucide-react';
import { Button } from '../Button/Button';
import type { ButtonSize } from '../Button/Button';
import { Menu } from '../Menu/Menu';
import { Tag } from '../Tag/Tag';
import styles from './SavedViewsMenu.module.css';

export interface SavedViewChoice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface SavedViewsAction {
  label: string;
  onChoose: () => void;
}

export interface SavedViewsMenuProps<V extends SavedViewChoice> {
  /** Undefined while they load. */
  views: V[] | undefined;
  active: V | null;
  /** The page differs from the active view: "Modified" on the button. */
  modified: boolean;
  empty: string;
  onApply: (view: V) => void;
  /** Save, update, manage…: listed under the views, in this order. */
  actions: SavedViewsAction[];
  size?: ButtonSize;
}

/** The Saved views button: the views to apply, the active one ticked, then the page's actions. */
export function SavedViewsMenu<V extends SavedViewChoice>({
  views,
  active,
  modified,
  empty,
  onApply,
  actions,
  size,
}: SavedViewsMenuProps<V>) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size={size} icon={<Bookmark />}>
          {active ? `View: ${active.name}` : 'Saved views'}
          {modified && ' '}
          {modified && <span className={styles.modified}>Modified</span>}
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        {views?.length === 0 && <Menu.Note>{empty}</Menu.Note>}
        {views?.map((view) => (
          <Menu.Choice
            key={view.id}
            checked={view.id === active?.id}
            onChoose={() => onApply(view)}
          >
            <span className={styles.name}>{view.name}</span>
            {view.isDefault && <Tag>Default</Tag>}
          </Menu.Choice>
        ))}
        {views && views.length > 0 && <Menu.Separator />}
        {actions.map((action) => (
          <Menu.Item key={action.label} onChoose={action.onChoose}>
            {action.label}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
