import { Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { SavedViewsMenu as ViewsMenu } from '@/ui/SavedViewsMenu/SavedViewsMenu';
import { useToast } from '@/ui/Toast/useToast';
import type { ReportKey } from '../reports';
import { useReportViews, useUpdateReportView } from './api';
import type { ReportView } from './api';
import { ManageViewsPanel } from './ManageViewsPanel';
import { SaveViewDialog } from './SaveViewDialog';
import { sameQuery, useViewRefusal } from './saved-views';

type Dialog = 'save' | 'update' | 'manage' | null;

/**
 * Saved views: the person's views of the report, the active one ticked, "Modified" when the
 * address differs from it. A view is an address, so applying one is a navigation and Back returns.
 */
export function SavedViewsMenu({ report }: { report: ReportKey }) {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const views = useReportViews(report).data?.items;
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const update = useUpdateReportView(report);
  const refused = useViewRefusal();
  const { show } = useToast();
  const matched = views?.find((v) => sameQuery(v.query, query));
  if (matched && matched.id !== appliedId) {
    setAppliedId(matched.id);
  }
  const active = views?.find((v) => v.id === (matched?.id ?? appliedId)) ?? null;
  const modified = active !== null && !sameQuery(active.query, query);
  useDefaultView(views, query, (view) =>
    setParams(new URLSearchParams(view.query), { replace: true }),
  );

  function apply(view: ReportView) {
    setAppliedId(view.id);
    setParams(new URLSearchParams(view.query));
  }

  function updateActive(view: ReportView) {
    update.mutate(
      { viewId: view.id, body: { version: view.version, query } },
      {
        onSuccess: (saved) => show({ message: `View '${saved.name}' updated` }),
        onError: (error) => refused(error, 'name'),
        onSettled: () => setDialog(null),
      },
    );
  }

  return (
    <>
      <ViewsMenu
        size="sm"
        views={views}
        active={active}
        modified={modified}
        empty="No saved views yet — set the filters, then save them."
        onApply={apply}
        actions={[
          {
            label: modified ? 'Save as new view…' : 'Save current filters…',
            onChoose: () => setDialog('save'),
          },
          ...(modified ? [{ label: 'Update view…', onChoose: () => setDialog('update') }] : []),
          ...(views && views.length > 0
            ? [{ label: 'Manage views…', onChoose: () => setDialog('manage') }]
            : []),
        ]}
      />
      {dialog === 'save' && (
        <SaveViewDialog
          report={report}
          views={views ?? []}
          query={query}
          onOpenChange={(open) => !open && setDialog(null)}
          onSaved={(view) => setAppliedId(view.id)}
        />
      )}
      {dialog === 'update' && active && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          title={`Update your view '${active.name}'?`}
          confirmLabel="Update view"
          onConfirm={() => updateActive(active)}
          busy={update.isPending}
        >
          It will keep the filters you see now instead of the ones it had.
        </ConfirmDialog>
      )}
      <ManageViewsPanel
        report={report}
        open={dialog === 'manage'}
        onOpenChange={(open) => !open && setDialog(null)}
        views={views ?? []}
      />
    </>
  );
}

/** Opening the report with nothing in its address applies the default view, once per visit. */
function useDefaultView(
  views: ReportView[] | undefined,
  query: string,
  apply: (view: ReportView) => void,
) {
  const [opened] = useState(query);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || !views) {
      return;
    }
    checked.current = true;
    const preferred = views.find((v) => v.isDefault);
    if (opened === '' && query === '' && preferred) {
      apply(preferred);
    }
  }, [views, opened, query, apply]);
}

/** The report as it is now, filters included, for someone else to open. */
export function CopyLinkButton() {
  const { show } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      show({ message: 'Link copied' });
    } catch {
      show({ message: "The link couldn't be copied. Copy it from the address bar instead." });
    }
  }

  return (
    <Button size="sm" icon={<Link2 />} onClick={() => void copy()}>
      Copy link
    </Button>
  );
}
