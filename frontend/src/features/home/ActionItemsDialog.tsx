import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { Button, LinkButton } from '@/ui/Button/Button';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { actionHref, actionReason, useHomeActionItems, useRemindLater } from './action-items';
import type { HomeActionItem } from './action-items';
import styles from './ActionItemsDialog.module.css';

/** Opens once on landing when the server says there is something to do; Escape closes it until next time. */
export function ActionItemsDialog() {
  const items = useHomeActionItems();
  const remindLater = useRemindLater();
  const [closed, setClosed] = useState(false);
  const page = items.data;
  if (!page?.show || closed) {
    return null;
  }

  return (
    <Dialog.Root open onOpenChange={(open) => setClosed(!open)}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog}>
          <Dialog.Title className={styles.title}>Your action items</Dialog.Title>
          <Dialog.Description className={styles.text}>{countText(page.total)}</Dialog.Description>
          <ul className={styles.rows}>
            {page.items.map((item) => (
              <ActionRow key={`${item.kind}-${item.record.id}`} item={item} />
            ))}
          </ul>
          <div className={styles.actions}>
            <Dialog.Close asChild>
              <Button>Close</Button>
            </Dialog.Close>
            <Button
              variant="primary"
              aria-busy={remindLater.isPending || undefined}
              onClick={() => remindLater.mutate(undefined, { onSuccess: () => setClosed(true) })}
            >
              Remind me later
            </Button>
          </div>
          {remindLater.isError && (
            <p role="alert" className={styles.error}>
              Couldn&apos;t save the reminder. Try again.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ActionRow({ item }: { item: HomeActionItem }) {
  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <div className={styles.head}>
          <span className={styles.name}>{item.record.name}</span>
          {item.overdue && <StatusChip tone="problem">Overdue</StatusChip>}
        </div>
        <p className={styles.meta}>
          {actionReason(item)}
          {item.plan && ` · ${item.plan.name}`}
        </p>
      </div>
      <LinkButton size="sm" to={actionHref(item)} aria-label={`Go to ${item.record.name}`}>
        Go to
      </LinkButton>
    </li>
  );
}

function countText(total: number): string {
  return total === 1 ? '1 thing needs you.' : `${total} things need you.`;
}
