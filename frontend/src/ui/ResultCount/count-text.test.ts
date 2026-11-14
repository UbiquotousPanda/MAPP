import { describe, expect, it } from 'vitest';
import { countText } from './count-text';

describe('countText', () => {
  it('writes "n of m" with the noun of the total, also when nothing is filtered out', () => {
    const noun = { one: 'team', many: 'teams' };
    expect(countText(0, 1, noun)).toBe('0 of 1 team');
    expect(countText(3, 3, noun)).toBe('3 of 3 teams');
    expect(countText(1200, 1204, { one: 'entry', many: 'entries' })).toBe('1,200 of 1,204 entries');
  });
});
