import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  COLUMN_KEYS,
  DEFAULT_PARAMS,
  PAGE_SIZES,
  SORT_KEYS,
  readRequestsParams,
  writeRequestsParams,
} from './schemas';
import type { RequestsParams } from './schemas';

const word = fc.stringMatching(/^[A-Za-z0-9-]{1,12}$/);
const params: fc.Arbitrary<RequestsParams> = fc.record({
  vendors: fc.uniqueArray(
    fc
      .stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,20}$/)
      .map((v) => v.trim())
      .filter(Boolean),
    { maxLength: 3 },
  ),
  requestOwners: fc.uniqueArray(word, { maxLength: 3 }),
  statuses: fc.uniqueArray(word, { maxLength: 3 }),
  q: fc.stringMatching(/^[a-z0-9]{0,20}$/),
  sort: fc.constantFrom(...SORT_KEYS),
  order: fc.constantFrom('asc' as const, 'desc' as const),
  page: fc.integer({ min: 1, max: 500 }),
  pageSize: fc.constantFrom(...PAGE_SIZES),
  columns: fc.shuffledSubarray([...COLUMN_KEYS], { minLength: 1 }),
});

describe('the report address of Purchase requests (042 FR-004, FR-016, FR-017)', () => {
  it('keeps every parameter through the address and the frame’s parameters beside them', () => {
    fc.assert(
      fc.property(params, (next) => {
        const written = writeRequestsParams(new URLSearchParams('year=2026'), next);

        expect(readRequestsParams(written)).toEqual(next);
        expect(written.get('year')).toBe('2026');
      }),
    );
  });

  it('leaves the defaults out of the address', () => {
    expect(writeRequestsParams(new URLSearchParams(), DEFAULT_PARAMS).toString()).toBe('');
  });

  it('drops malformed values to the defaults, and a bad column list restores every column', () => {
    const bad = new URLSearchParams(
      'sort=nope&order=up&page=0&pageSize=7&columns=id,id&requestOwner=a%20b',
    );

    expect(readRequestsParams(bad)).toEqual(DEFAULT_PARAMS);
    expect(readRequestsParams(new URLSearchParams('columns=nonsense')).columns).toEqual([
      ...COLUMN_KEYS,
    ]);
  });
});
