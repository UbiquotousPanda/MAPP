import { useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';

export type AttributeLevel = components['schemas']['AttributeLevel'];

/** The query keys of Settings data; invalidate a prefix to refresh every page that shows it. */
export const SETTINGS_KEYS = {
  models: ['models'] as const,
  activityTypes: ['activity-types'] as const,
  activityCategories: ['activity-categories'] as const,
  shellAttributes: (level: AttributeLevel) => ['shell-attributes', level] as const,
  shellAttribute: (id: string) => ['shell-attribute', id] as const,
  shellAttributeOptions: (id: string, params: object) =>
    ['shell-attribute-options', id, params] as const,
  shellAttributeForm: (level: AttributeLevel) => ['shell-attribute-form', level] as const,
  currencies: ['currencies'] as const,
  financeBudgets: (year?: number) => ['finance-budgets', year ?? 'current'] as const,
  overview: ['settings-overview'] as const,
};

export function useModels() {
  return useQuery({
    queryKey: SETTINGS_KEYS.models,
    queryFn: () => call(api.GET('/api/v1/models')),
  });
}

export function useActivityTypes() {
  return useQuery({
    queryKey: SETTINGS_KEYS.activityTypes,
    queryFn: () => call(api.GET('/api/v1/activity-types')),
  });
}

export function useActivityCategories() {
  return useQuery({
    queryKey: SETTINGS_KEYS.activityCategories,
    queryFn: () => call(api.GET('/api/v1/settings/activity-categories')),
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: SETTINGS_KEYS.currencies,
    queryFn: () => call(api.GET('/api/v1/currencies')),
  });
}

export function useFinanceBudgets(year?: number) {
  return useQuery({
    queryKey: SETTINGS_KEYS.financeBudgets(year),
    queryFn: () =>
      call(api.GET('/api/v1/finance-budgets', { params: { query: year ? { year } : {} } })),
  });
}

/** Always asked again when a form opens, so a setting changed a moment ago shows on the next form. */
export function useAttributeForm(level: AttributeLevel) {
  return useQuery({
    queryKey: SETTINGS_KEYS.shellAttributeForm(level),
    queryFn: () =>
      call(api.GET('/api/v1/shell-attribute-forms/{level}', { params: { path: { level } } })),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useSettingsOverview() {
  return useQuery({
    queryKey: SETTINGS_KEYS.overview,
    queryFn: () => call(api.GET('/api/v1/settings/overview')),
  });
}
