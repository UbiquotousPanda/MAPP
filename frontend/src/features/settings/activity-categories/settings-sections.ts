import { Tags } from 'lucide-react';
import type { SettingsSection } from '../sections';
import { ActivityCategoryCount } from './ActivityCategoryCount';

export const ACTIVITY_CATEGORIES_PATH = '/settings/activity-categories';

export const ACTIVITY_CATEGORY_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: 'Activity categories',
    description: 'The groups of activity types the reports open on, each with its activity types.',
    path: ACTIVITY_CATEGORIES_PATH,
    icon: Tags,
    ActiveCount: ActivityCategoryCount,
  },
];
