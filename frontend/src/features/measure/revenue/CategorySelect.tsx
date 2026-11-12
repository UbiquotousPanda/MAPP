import { useActivityCategories } from '@/features/settings';
import { Select } from '@/ui/Select/Select';
import { useOwnParam } from '../shared/useOwnParam';

const ALL = '';
const UNCATEGORISED = 'uncategorised';

/** The activity category control (049-C10): narrows the cards, the series and the ranked list. */
export function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const categories = useActivityCategories();
  return (
    <Select
      label="Activity category"
      value={value}
      options={[
        { value: ALL, label: 'All categories' },
        ...(categories.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
        { value: UNCATEGORISED, label: 'Uncategorised' },
      ]}
      onChange={onChange}
    />
  );
}

/** The category select bound to the address, for a report's toolbar. */
export function CategoryControl() {
  const [category, setCategory] = useOwnParam('category');
  return <CategorySelect value={category} onChange={setCategory} />;
}
