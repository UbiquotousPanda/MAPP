import { Star } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../Button/Button';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { useViewRefusal } from '../SavedViewsMenu/saved-views';
import type { SavedViewChoice } from '../SavedViewsMenu/SavedViewsMenu';
import { SidePanel } from '../SidePanel/SidePanel';
import { Tag } from '../Tag/Tag';
import { useToast } from '../Toast/useToast';
import styles from './ManageViewsPanel.module.css';
import { RenameViewDialog } from './RenameViewDialog';

export interface SavedViewChanges<V extends SavedViewChoice> {
  change: (view: V, change: { name: string } | { isDefault: boolean }) => Promise<V>;
  remove: (view: V) => Promise<V>;
  /** Undo of a delete: the view saved again with its name, content and default flag. */
  restore: (view: V) => Promise<V>;
}

export interface ManageViewsPanelProps<V extends SavedViewChoice> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  views: V[];
  changes: SavedViewChanges<V>;
  /** The default as a star toggle; otherwise Set as default and Remove default. */
  star?: boolean;
  /** What the message says when a view becomes the default. */
  defaultMessage?: (name: string) => string;
  /** Asks this before deleting; without it a view is deleted at once and the panel closes. */
  deleteQuestion?: string;
}

/** Your saved views: set or remove the default, rename, and delete with Undo in the message. */
export function ManageViewsPanel<V extends SavedViewChoice>({
  open,
  onOpenChange,
  views,
  changes,
  star = false,
  defaultMessage = (name) => `'${name}' is now your default view`,
  deleteQuestion,
}: ManageViewsPanelProps<V>) {
  const [renaming, setRenaming] = useState<V | null>(null);
  const [deleting, setDeleting] = useState<V | null>(null);
  const [busy, setBusy] = useState(false);
  const refused = useViewRefusal();
  const { show } = useToast();

  async function attempt(work: () => Promise<void>) {
    try {
      await work();
    } catch (error) {
      refused(error);
    }
  }

  const setDefault = (view: V) =>
    attempt(async () => {
      const saved = await changes.change(view, { isDefault: !view.isDefault });
      show({
        message: saved.isDefault
          ? defaultMessage(saved.name)
          : `'${saved.name}' is no longer your default view`,
      });
    });

  const restore = (view: V) =>
    attempt(async () => {
      const saved = await changes.restore(view);
      show({ message: `View '${saved.name}' restored` });
    });

  async function remove(view: V) {
    setBusy(true);
    await attempt(async () => {
      const deleted = await changes.remove(view);
      if (!deleteQuestion) {
        onOpenChange(false);
      }
      show({
        message: `View '${deleted.name}' deleted`,
        action: { label: 'Undo', altText: 'Save the view again', onClick: () => restore(deleted) },
      });
    });
    setBusy(false);
    setDeleting(null);
  }

  return (
    <>
      <SidePanel
        open={open}
        onOpenChange={onOpenChange}
        title="Your saved views"
        footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
      >
        <ul className={styles.list}>
          {views.map((view) => (
            <li key={view.id} className={styles.view}>
              <div className={styles.name}>
                <span className={styles.label}>{view.name}</span>
                {view.isDefault && <Tag>Default</Tag>}
              </div>
              <div className={styles.actions}>
                <Button
                  size="sm"
                  icon={star ? <Star aria-hidden="true" /> : undefined}
                  aria-pressed={star ? view.isDefault : undefined}
                  onClick={() => void setDefault(view)}
                >
                  {star ? 'Default' : view.isDefault ? 'Remove default' : 'Set as default'}{' '}
                  <span className="visually-hidden">{view.name}</span>
                </Button>
                <Button size="sm" onClick={() => setRenaming(view)}>
                  Rename <span className="visually-hidden">{view.name}</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => (deleteQuestion ? setDeleting(view) : void remove(view))}
                >
                  Delete <span className="visually-hidden">{view.name}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </SidePanel>
      {renaming && (
        <RenameViewDialog
          view={renaming}
          views={views}
          rename={(view, name) => changes.change(view, { name })}
          onClose={() => setRenaming(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(isOpen) => !isOpen && setDeleting(null)}
          title={`Delete view '${deleting.name}'?`}
          confirmLabel="Delete view"
          tone="danger"
          onConfirm={() => void remove(deleting)}
          busy={busy}
        >
          {deleteQuestion}
        </ConfirmDialog>
      )}
    </>
  );
}
