import { useActivityCategories } from '@/features/settings';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import type { OwnFilters } from '../shared/ReportToolbar';
import { useOwnParam } from '../shared/useOwnParam';

const TITLE = 'Activity category';

/** The activity category (049-C10) behind Filters (n), with its chip: narrows the cards, the series and the list. */
export function useCategoryFilter(): OwnFilters {
  const categories = useActivityCategories();
  const [category, setCategory] = useOwnParam('category');
  const choices = [
    ...(categories.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    { value: 'uncategorised', label: 'Uncategorised' },
  ];
  const label = choices.find((c) => c.value === category)?.label ?? category;
  return {
    menus: (
      <FilterMenu
        label={TITLE}
        choices={choices}
        selected={category ? [category] : []}
        multiple={false}
        summary={category ? label : undefined}
        onChange={(values) => setCategory(values[0] ?? '')}
      />
    ),
    chips: category ? [{ key: 'category', label: `${TITLE}: ${label}` }] : [],
  };
}
