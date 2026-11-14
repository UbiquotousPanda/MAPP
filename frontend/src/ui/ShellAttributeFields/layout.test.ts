import { describe, expect, it } from 'vitest';
import { attribute, option } from '@/testing/fixtures/attribute-forms';
import { columnsFor, filledOrder } from './layout';

const short = (id: string) => attribute({ id, label: id, type: 'text' });
const long = (id: string) => attribute({ id, label: id, type: 'longText' });
const ids = (...list: ReturnType<typeof short>[]) => filledOrder(list, 2).map((a) => a.id);

describe('filledOrder: short fields fill each row (D-433)', () => {
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

  it('keeps check boxes in one column, listed down, whatever their number', () => {
    const boxes = attribute({
      id: 'six',
      label: 'six',
      type: 'multipleChoice',
      options: Array.from({ length: 6 }, (_, i) => option(`six-${i}`, `${i}`)),
    });

    expect(filledOrder([short('a'), boxes, short('b')], 3).map((a) => a.id)).toEqual([
      'a',
      'six',
      'b',
    ]);
  });

  it('fills three to a row on a wide form, and keeps the order in one column', () => {
    const list = [short('a'), short('b'), long('c'), short('d'), short('e')];

    expect(filledOrder(list, 3).map((a) => a.id)).toEqual(['a', 'b', 'd', 'c', 'e']);
    expect(filledOrder(list, 1).map((a) => a.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('lays a drop-down of many options in one column, unlike check boxes', () => {
    const select = attribute({
      id: 'group',
      label: 'group',
      type: 'singleChoice',
      options: Array.from({ length: 8 }, (_, i) => option(`o-${i}`, `${i}`)),
    });

    expect(ids(short('a'), select, short('b'))).toEqual(['a', 'group', 'b']);
  });

  it('chooses one, two or three columns by the form width', () => {
    expect([599, 600, 899, 900].map(columnsFor)).toEqual([1, 2, 2, 3]);
  });
});
