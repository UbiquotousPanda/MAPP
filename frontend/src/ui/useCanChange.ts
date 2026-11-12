import { useAccess } from '@/session/access';
import type { Permission } from '@/session/access';

/** Nothing counts as allowed until the session has loaded. */
export function useCanChange(permission: Permission = 'settings.manage'): boolean {
  return useAccess().has(permission);
}
