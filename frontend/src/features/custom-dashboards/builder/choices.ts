import type { ChoiceOption } from '@/ui/ChoiceField/ChoiceField';

/** Value and label pairs as ChoiceField options, under `group` when given. */
export function choices(
  options: readonly { value: string; label: string }[],
  group?: string,
): ChoiceOption[] {
  return options.map(({ value, label }) => ({ id: value, label, group }));
}
