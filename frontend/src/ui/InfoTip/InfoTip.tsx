import { Info, Lock } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import styles from './InfoTip.module.css';

export interface InfoTipProps {
  text: string;
  label: string;
  kind?: 'info' | 'locked';
}

const CLOSE_DELAY_MS = 150;

/** A Radix Popover rather than a tooltip, because a tooltip cannot be opened by tapping. */
export function InfoTip({ text, label, kind = 'info' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(0);
  const name = kind === 'locked' ? `Why ${label} can't change` : `About ${label}`;

  function show() {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  }

  // Only a mouse hovers: a finger also "enters" and "leaves", but that is a tap.
  function showOnHover(event: PointerEvent) {
    if (event.pointerType === 'mouse') {
      show();
    }
  }

  // The short delay lets the mouse move onto the bubble without it closing (WCAG 1.4.13).
  function hideAfterHover(event: PointerEvent) {
    if (event.pointerType === 'mouse') {
      closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={styles.button}
          aria-label={name}
          onPointerEnter={showOnHover}
          onPointerLeave={hideAfterHover}
          onFocus={show}
          onClick={(event) => {
            // Stops Radix from toggling: a click on the ⓘ only ever opens the tip.
            event.preventDefault();
            show();
          }}
        >
          {kind === 'locked' ? <Lock /> : <Info />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.bubble}
          side="top"
          sideOffset={6}
          aria-label={name}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerEnter={showOnHover}
          onPointerLeave={hideAfterHover}
        >
          {text}
          <Popover.Arrow className={styles.arrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
