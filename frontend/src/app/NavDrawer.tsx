import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { Drawer } from '@/ui/Drawer/Drawer';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
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
    <>
      <Tooltip content="Open menu">
        <Button
          variant="tertiary"
          icon={<Menu />}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpenOn(location.key)}
        />
      </Tooltip>
      <Drawer
        open={open}
        onOpenChange={(isOpen) => setOpenOn(isOpen ? location.key : null)}
        title="Menu"
        closeLabel="Close menu"
      >
        <Sidebar inDrawer />
      </Drawer>
    </>
  );
}
