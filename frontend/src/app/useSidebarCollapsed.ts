import { useSyncExternalStore } from 'react';
import { useCurrentUser, useSession } from '@/session/useSession';

const NARROW = '(max-width: 1279px)';

let expandedWhileNarrow = false;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', onChange);
  listeners.add(onChange);
  return () => {
    query.removeEventListener('change', onChange);
    listeners.delete(onChange);
  };
}

function setExpandedWhileNarrow(expanded: boolean) {
  expandedWhileNarrow = expanded;
  listeners.forEach((listener) => listener());
}

// Below 1280 px: the icon rail until expanded in this session, never saved; above: the saved preference.
export function useSidebarCollapsed(): { collapsed: boolean; toggle: () => void } {
  const person = useCurrentUser();
  const { updatePreferences } = useSession();
  const narrow = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
  const expanded = useSyncExternalStore(
    subscribe,
    () => expandedWhileNarrow,
    () => false,
  );
  const collapsed = narrow ? !expanded : person.preferences.sidebarCollapsed;

  function toggle() {
    if (narrow) {
      setExpandedWhileNarrow(collapsed);
    } else {
      updatePreferences({ sidebarCollapsed: !collapsed });
    }
  }

  return { collapsed, toggle };
}
