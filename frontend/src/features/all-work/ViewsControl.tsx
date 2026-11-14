import { useState } from 'react';
import { ManageViewsPanel } from '@/ui/ManageViewsPanel/ManageViewsPanel';
import type { SavedViewChanges } from '@/ui/ManageViewsPanel/ManageViewsPanel';
import { useViewRefusal } from '@/ui/SavedViewsMenu/saved-views';
import { SaveViewDialog } from '@/ui/SaveViewDialog/SaveViewDialog';
import { useToast } from '@/ui/Toast/useToast';
import { useCreateView, useDeleteView, useSavedViews, useUpdateView } from './api';
import type { SavedView, ViewState } from './all-work-types';
import { sameState, savedStateOf } from './view-state';
import { ViewsMenu } from './ViewsMenu';

export interface ViewsControlProps {
  /** The state on screen; null while the visit starts. */
  state: ViewState | null;
  /** The saved view applied last (FR-030). */
  appliedViewId: string | null;
  onApply: (view: SavedView) => void;
  /** A view was saved from what is on screen: it becomes the active one. */
  onSaved: (view: SavedView) => void;
  onStandard: () => void;
}

/** The Views menu, "Modified" while the state differs from the active view, and its dialogs. */
export function ViewsControl({
  state,
  appliedViewId,
  onApply,
  onSaved,
  onStandard,
}: ViewsControlProps) {
  const views = useSavedViews();
  const create = useCreateView();
  const update = useUpdateView();
  const remove = useDeleteView();
  const refused = useViewRefusal();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState(false);
  const items = views.data?.items;
  const active = items?.find((view) => view.id === appliedViewId) ?? null;
  const modified = Boolean(active && state && !sameState(state, active.state));

  const changes: SavedViewChanges<SavedView> = {
    change: (view, body) => update.mutateAsync({ viewId: view.id, body }),
    remove: (view) => remove.mutateAsync(view.id),
    restore: ({ name, state: saved, isDefault }) =>
      create.mutateAsync({ name, state: saved, isDefault }),
  };

  /** Update view: the active view keeps what is on screen now. */
  function updateActive() {
    if (!active || !state) return;
    update.mutate(
      { viewId: active.id, body: { state: savedStateOf(state) } },
      {
        onSuccess: (view) => show({ message: `View '${view.name}' updated` }),
        onError: (error) => refused(error),
      },
    );
  }

  return (
    <>
      <ViewsMenu
        views={items}
        active={active}
        modified={modified}
        onApply={onApply}
        onSave={() => setSaving(true)}
        onUpdate={updateActive}
        onSaveAsNew={() => setSaving(true)}
        onManage={() => setManaging(true)}
        onStandard={onStandard}
      />
      {saving && state && (
        <SaveViewDialog
          title="Save current view"
          defaultLabel="Use as my default view"
          replaceText="It will show what you see now."
          views={items ?? []}
          create={(name, isDefault) =>
            create.mutateAsync({ name, state: savedStateOf(state), isDefault })
          }
          replace={(view, isDefault) =>
            update.mutateAsync({
              viewId: view.id,
              body: { state: savedStateOf(state), ...(isDefault && { isDefault: true }) },
            })
          }
          onSaved={onSaved}
          onOpenChange={setSaving}
        />
      )}
      <ManageViewsPanel
        open={managing}
        onOpenChange={setManaging}
        views={items ?? []}
        changes={changes}
        deleteQuestion="Only your saved view is deleted; no plans or records change."
      />
    </>
  );
}
