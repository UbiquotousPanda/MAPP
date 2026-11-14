import { Tooltip as RadixTooltip } from 'radix-ui';
import { useState } from 'react';
import type { FocusEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** The one control the tooltip is about: a button or a link (it must accept a ref). */
  children: ReactElement<{ onClick?: unknown }>;
}

export const TooltipProvider = RadixTooltip.Provider;

const ACTS_ON_TAP = 'a, [type="submit"], [aria-haspopup], [aria-expanded], [aria-controls]';

// Never inside a menu, nor on a dialog's or panel's close button: Radix swallows the first Escape (R14).
export function Tooltip({ content, side = 'top', children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const showsOnly = !children.props.onClick;
  // A finger cannot hover: a tap on a control that only shows something opens the bubble instead.
  const openOnTap = (event: MouseEvent<HTMLElement>) => {
    if (lastPointer === 'touch' && showsOnly && !event.currentTarget.matches(ACTS_ON_TAP)) {
      event.preventDefault();
      setOpen(true);
    }
  };
  return (
    <RadixTooltip.Root open={open} onOpenChange={setOpen}>
      <RadixTooltip.Trigger asChild onFocus={onlyKeyboardFocus} onClick={openOnTap}>
        {children}
      </RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content className={styles.bubble} side={side} sideOffset={6}>
          {content}
          <RadixTooltip.Arrow className={styles.arrow} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

let usingKeyboard = true;
let lastPointer = '';

if (typeof document !== 'undefined') {
  document.addEventListener(
    'keydown',
    (event) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        usingKeyboard = true;
      }
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      lastPointer = event.pointerType;
    },
    true,
  );
  for (const type of ['pointerdown', 'mousedown', 'touchstart']) {
    document.addEventListener(
      type,
      () => {
        usingKeyboard = false;
      },
      true,
    );
  }
}

// A menu closed with the mouse refocuses its trigger; a bubble opened then would cover its neighbour.
function onlyKeyboardFocus(event: FocusEvent<HTMLElement>) {
  if (!usingKeyboard) {
    event.preventDefault();
  }
}
