import type { ActionsMenuItem } from '@/ui/ActionsMenu/ActionsMenu';
import type { ActivityCategory } from './api';

export interface ActivityCategoryActions {
  view: (category: ActivityCategory) => void;
  edit: (category: ActivityCategory) => void;
  setActive: (category: ActivityCategory, active: boolean) => void;
  remove: (category: ActivityCategory) => void;
}

export function moreActions(
  category: ActivityCategory,
  actions: ActivityCategoryActions,
): ActionsMenuItem[] {
  return [
    category.active
      ? { label: 'Set inactive', onSelect: () => actions.setActive(category, false) }
      : { label: 'Reactivate', onSelect: () => actions.setActive(category, true) },
    {
      label: 'Delete',
      tone: 'danger',
      separatorBefore: true,
      onSelect: () => actions.remove(category),
    },
  ];
}

export function typeCount(category: ActivityCategory): string {
  const count = category.activityTypes.length;
  if (count === 0) {
    return 'None yet';
  }
  return count === 1 ? '1 activity type' : `${count} activity types`;
}
