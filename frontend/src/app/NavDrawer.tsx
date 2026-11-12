import { Menu, X } from 'lucide-react';
// eslint-disable-next-line no-restricted-imports -- the app shell's only drawer; it moves to ui/ at a second use
import { Dialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import styles from './NavDrawer.module.css';
import { Sidebar } from './Sidebar';

const SIDEBAR_SHOWN = '(min-width: 960px)';

export function NavDrawer() {
  const location = useLocation();
  // The drawer belongs to the address it was opened on, so any navigation leaves it closed.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === location.key;

  useEffect(() => {
    const sidebarShown = window.matchMedia(SIDEBAR_SHOWN);
    function closeWhenSidebarShows() {
      if (sidebarShown.matches) {
        setOpenOn(null);
      }
    }
    sidebarShown.addEventListener('change', closeWhenSidebarShows);
    return () => sidebarShown.removeEventListener('change', closeWhenSidebarShows);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => setOpenOn(isOpen ? location.key : null)}>
      <Tooltip content="Open menu">
        <Dialog.Trigger asChild>
          <Button variant="tertiary" icon={<Menu />} aria-label="Open menu" />
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        {/* No description: tell Radix so, instead of pointing to a missing text. */}
        <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
          <Dialog.Title className="visually-hidden">Menu</Dialog.Title>
          {/* No tooltip: inside a dialog it would swallow the first Escape (research R14). */}
          <Dialog.Close asChild>
            <Button
              variant="tertiary"
              icon={<X />}
              aria-label="Close menu"
              className={styles.close}
            />
          </Dialog.Close>
          <Sidebar inDrawer />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
