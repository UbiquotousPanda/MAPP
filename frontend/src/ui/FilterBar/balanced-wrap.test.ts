import { describe, expect, it } from 'vitest';
import { balancedWidth, linesAt } from './balanced-wrap';

describe('balanced filter rows (D-421)', () => {
  it.each([
    ['everything fits on one line', [100, 100, 100], 1000, null],
    ['10 + 6 becomes 8 + 8', Array<number>(16).fill(100), 1000, 800],
    ['5 + 1 becomes 3 + 3', [100, 100, 100, 100, 100, 100], 500, 300],
  ])('%s', (_, widths, available, expected) => {
    const width = balancedWidth(widths, 0, available);
    expect(width).toBe(expected);
    if (width !== null) {
      expect(linesAt(widths, 0, width)).toBe(linesAt(widths, 0, available));
    }
  });
});
