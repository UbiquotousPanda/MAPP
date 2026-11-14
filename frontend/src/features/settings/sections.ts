/** The page's full list, with the cards other features add, is assembled in app/settings-sections.ts. */
import { Calculator, Coins, ListChecks, Shapes, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { components } from '@/api/generated/schema';
import type { Permission } from '@/session/access';

export interface SettingsSection {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  /** 002's sections, from GET /api/v1/settings/overview; other features' sections use ActiveCount. */
  overviewKey?: keyof components['schemas']['SettingsOverview'];
  ActiveCount?: ComponentType;
  /** Only a section with no page at all; a page still being built is a link to its stub. */
  comingSoon?: boolean;
  permission?: Permission;
}

export const SETTINGS_OWN_SECTIONS: SettingsSection[] = [
  {
    title: 'Models',
    description:
      'The rulebooks plans use: conversion rates, average deal size and allowed activity types.',
    path: '/settings/models',
    icon: Calculator,
    overviewKey: 'models',
  },
  {
    title: 'Activity types',
    description:
      'The kinds of work an activity can be, each with an optional default planned cost.',
    path: '/settings/activity-types',
    icon: Shapes,
    overviewKey: 'activityTypes',
  },
  {
    title: 'Shell attributes',
    description: "Shell's own fields on each level's form, with their options and markings.",
    path: '/settings/shell-attributes',
    icon: ListChecks,
    overviewKey: 'shellAttributes',
  },
  {
    title: 'Currencies',
    description:
      'The currencies line items, plans and people can use, with their rate history and GSAP rate import.',
    path: '/settings/currencies',
    icon: Coins,
    overviewKey: 'currencies',
  },
  {
    title: 'Finance budget items',
    description: 'The finance budget items line items link to.',
    path: '/settings/finance-budget-items',
    icon: Wallet,
    overviewKey: 'financeBudgetItems',
  },
];
