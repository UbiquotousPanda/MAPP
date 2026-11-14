import { Link } from 'react-router';
import type { components } from '@/api/generated/schema';
import { FormDialog } from '@/ui/FormDialog/FormDialog';
import { fieldHref, isPlanningType } from '@/ui/record-links';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import { groupLabel } from '../plan-text';
import styles from './dialogs.module.css';

type ReadinessGroup = components['schemas']['ReadinessGroup'];

export interface PublishBlockedDialogProps {
  planId: string;
  open: boolean;
  /** Every needed field that stops publishing, grouped by record. */
  missing: ReadinessGroup[];
  onClose: () => void;
}

/** Grouped by record: the plan, then each campaign or initiative. The plan stays Draft. */
export function PublishBlockedDialog({
  open,
  planId,
  missing,
  onClose,
}: PublishBlockedDialogProps) {
  const groups = missing;
  const count = groups.reduce((total, group) => total + group.fields.length, 0);
  return (
    <FormDialog
      open={open}
      onOpenChange={(open) => !open && onClose()}
      title={count === 1 ? 'Publish needs 1 field' : `Publish needs ${count} fields`}
      description="Fill these in, then publish again:"
      submitLabel="Close"
      hideCancel
      onSubmit={onClose}
    >
      <div className={styles.stack}>
        {groups.map(({ record, fields }) => (
          <section key={`${record.type}:${record.id}`} className={styles.group}>
            <SectionHeading level={3} rank="label">
              {groupLabel(record)}
            </SectionHeading>
            <ul className={styles.list}>
              {fields.map((field) => (
                <li key={field.field}>
                  {isPlanningType(record.type) ? (
                    <Link
                      to={fieldHref(record.type, record.id, field.field, planId)}
                      onClick={onClose}
                    >
                      {field.label}
                    </Link>
                  ) : (
                    field.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </FormDialog>
  );
}
