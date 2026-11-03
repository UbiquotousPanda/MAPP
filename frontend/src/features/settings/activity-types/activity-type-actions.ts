import type { ActionsMenuItem } from '@/ui/ActionsMenu/ActionsMenu';
import type { ActivityType } from './api';

export interface ActivityTypeActions {
  view: (type: ActivityType) => void;
  edit: (type: ActivityType) => void;
  setActive: (type: ActivityType, active: boolean) => void;
  remove: (type: ActivityType) => void;
}

/** Set inactive or Reactivate · Delete (last, after a line — design system §6.1). */
export function moreActions(type: ActivityType, actions: ActivityTypeActions): ActionsMenuItem[] {
  return [
    type.active
      ? { label: 'Set inactive', onSelect: () => actions.setActive(type, false) }
      : { label: 'Reactivate', onSelect: () => actions.setActive(type, true) },
    {
      label: 'Delete',
      tone: 'danger',
      separatorBefore: true,
      onSelect: () => actions.remove(type),
    },
  ];
}

export function modelNames(type: ActivityType): string {
  if (type.models.length === 0) {
    return '—';
  }
  return type.models
    .map((model) => (model.active ? model.name : `${model.name} (inactive)`))
    .join(', ');
}

/** The category grouping the type, "Uncategorised" when none does: the reports count it there. */
export function categoryName(type: ActivityType): string {
  const { category } = type;
  if (!category) {
    return 'Uncategorised';
  }
  return category.active ? category.name : `${category.name} (inactive)`;
}
