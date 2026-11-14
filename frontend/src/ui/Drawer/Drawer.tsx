import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import styles from './Drawer.module.css';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

export function Drawer({ open, onOpenChange, title, closeLabel, children }: DrawerProps) {
  // Opened by the page's own button, not a Radix trigger, so the focus is returned by hand.
  const focusBeforeOpen = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.drawer}
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            focusBeforeOpen.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            focusBeforeOpen.current?.focus();
          }}
        >
          <Dialog.Title className="visually-hidden">{title}</Dialog.Title>
          {/* No tooltip: inside a dialog it would swallow the first Escape (research R14). */}
          <Dialog.Close asChild>
            <Button
              variant="tertiary"
              icon={<X />}
              aria-label={closeLabel}
              className={styles.close}
            />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
