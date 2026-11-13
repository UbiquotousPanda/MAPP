import { describe, expect, it } from 'vitest';
import { attribute, option } from '@/testing/fixtures/attribute-forms';
import { pairedOrder } from './layout';

const short = (id: string) => attribute({ id, label: id, type: 'text' });
const long = (id: string) => attribute({ id, label: id, type: 'longText' });
const ids = (...list: ReturnType<typeof short>[]) => pairedOrder(list).map((a) => a.id);

describe('pairedOrder: short fields two to a row (D-433)', () => {
  it('moves a wide field after the short one that completes the row', () => {
    expect(ids(short('group'), long('remarks'), short('code'))).toEqual([
      'group',
      'code',
      'remarks',
    ]);
  });

  it('keeps the order when every short field already has a partner', () => {
    expect(ids(short('a'), short('b'), long('c'), short('d'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps a wide field last when no short field follows it', () => {
    expect(ids(short('a'), long('b'))).toEqual(['a', 'b']);
  });

  it('treats three or more check boxes as wide and two as short', () => {
    const boxes = (id: string, count: number) =>
      attribute({
        id,
        label: id,
        type: 'multipleChoice',
        options: Array.from({ length: count }, (_, i) => option(`${id}-${i}`, `${i}`)),
      });

    expect(ids(short('a'), boxes('three', 3), short('b'))).toEqual(['a', 'b', 'three']);
    expect(ids(short('a'), boxes('two', 2), short('b'))).toEqual(['a', 'two', 'b']);
  });
});
