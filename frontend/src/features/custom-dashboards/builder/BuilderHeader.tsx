import { Eye, Redo2, Share2, Undo2 } from 'lucide-react';
import { Button, LinkButton } from '@/ui/Button/Button';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import styles from './Builder.module.css';

export interface BuilderHeaderProps {
  title: string;
  dashboardId: string | undefined;
  canShare: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSharing: () => void;
  onSave: () => void;
}

export function BuilderHeader({
  title,
  dashboardId,
  canShare,
  isSaving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSharing,
  onSave,
}: BuilderHeaderProps) {
  return (
    <PageHeader
      breadcrumb={[{ label: 'Dashboards', to: '/dashboards' }, { label: title }]}
      title={title}
      actions={
        <>
          <span className={styles.wideOnly}>
            <Tooltip content={canUndo ? 'Undo the last change' : 'Nothing to undo yet'}>
              <Button
                icon={<Undo2 />}
                aria-keyshortcuts="Control+Z Meta+Z"
                aria-disabled={!canUndo || undefined}
                onClick={onUndo}
              >
                Undo
              </Button>
            </Tooltip>
            <Tooltip content={canRedo ? 'Redo the change just undone' : 'Nothing to redo'}>
              <Button
                icon={<Redo2 />}
                aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                aria-disabled={!canRedo || undefined}
                onClick={onRedo}
              >
                Redo
              </Button>
            </Tooltip>
          </span>
          {dashboardId && canShare && (
            <Button icon={<Share2 />} onClick={onSharing}>
              Sharing
            </Button>
          )}
          {dashboardId && (
            <LinkButton icon={<Eye />} to={`/dashboards/${dashboardId}`}>
              View
            </LinkButton>
          )}
          <span className={styles.wideOnly}>
            <Button variant="primary" aria-busy={isSaving} onClick={onSave}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </span>
        </>
      }
    />
  );
}
