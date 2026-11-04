import { describe, expect, it } from 'vitest';
import { categoryFill, OTHER_COLOUR } from './chart-colours';

describe('categoryFill (042 FR-010, WCAG 1.4.1)', () => {
  it('gives the ten named series of a chart ten different fills, none of them Other grey', () => {
    const fills = Array.from({ length: 10 }, (_, i) => categoryFill(i));

    expect(new Set(fills).size).toBe(10);
    expect(fills).not.toContain(OTHER_COLOUR);
  });

  it('uses each categorical colour once before repeating any, and repeats it striped', () => {
    expect(categoryFill(0)).toBe('var(--chart-cat-1)');
    expect(categoryFill(6)).toBe('var(--chart-cat-7)');
    expect(categoryFill(7)).toContain('var(--chart-cat-1)');
    expect(categoryFill(7)).toContain('repeating-linear-gradient');
  });
});
