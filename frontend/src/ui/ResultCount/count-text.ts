import { formatWhole } from '@/format/decimal';

export interface ListNoun {
  one: string;
  many: string;
}

/** Every list's count, one way (design system §5.2): "4 of 5 models", "1 of 1 team". */
export function countText(shown: number, total: number, noun: ListNoun): string {
  return `${formatWhole(shown)} of ${formatWhole(total)} ${total === 1 ? noun.one : noun.many}`;
}
