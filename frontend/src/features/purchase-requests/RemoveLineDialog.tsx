import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import type { components } from '@/api/generated/schema';
import { Button } from '@/ui/Button/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import type { Money } from './api';
import { LAST_LINE, REMOVE_AFTER_SAVE, REMOVE_LINE, removeText, removeTitle } from './form-text';

type Availability = components['schemas']['ActionAvailability'];

export interface RemoveLineButtonProps {
  lineItemId: string;
  /** The stored line's amount, reserved on the line item; null for a line not saved yet. */
  reserved: Money | null;
  /** The stored line's access.remove; a line not saved yet can always go. */
  availability: Availability | null;
  isLast: boolean;
  onRemove: () => void;
}

/** Remove line (032 FR-015, FR-055): a stored line asks first, naming the money released. */
export function RemoveLineButton({
  lineItemId,
  reserved,
  availability,
  isLast,
  onRemove,
}: RemoveLineButtonProps) {
  const reasonId = useId();
  const [confirming, setConfirming] = useState(false);
  const reason = isLast ? LAST_LINE : availability?.available === false ? availability.reason : '';
  if (availability?.available === false && !reason) {
    return null;
  }

  function handleClick() {
    if (reason) {
      return;
    }
    if (reserved) {
      setConfirming(true);
    } else {
      onRemove();
    }
  }

  const button = (
    <Button
      size="sm"
      variant="tertiary"
      icon={<Trash2 />}
      aria-disabled={reason ? true : undefined}
      aria-describedby={reason ? reasonId : undefined}
      onClick={handleClick}
    >
      {REMOVE_LINE}
    </Button>
  );

  return (
    <>
      {reason ? <Tooltip content={reason}>{button}</Tooltip> : button}
      {reason && (
        <span id={reasonId} className="visually-hidden">
          {reason}
        </span>
      )}
      {reserved && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={removeTitle(lineItemId, reserved)}
          confirmLabel={REMOVE_LINE}
          tone="danger"
          onConfirm={() => {
            setConfirming(false);
            onRemove();
          }}
        >
          <p>{removeText(reserved)}</p>
          <p>{REMOVE_AFTER_SAVE}</p>
        </ConfirmDialog>
      )}
    </>
  );
}
