import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, TABLES, readSummaryParams, writeSummaryParams } from './schemas';
import type { SummaryParams } from './schemas';

const id = fc.stringMatching(/^[A-Za-z0-9-]{1,40}$/);
const segment = fc.option(id, { nil: '' });
const params: fc.Arbitrary<SummaryParams> = fc.record({
  category: fc.oneof(
    fc.constant(''),
    fc.constant('uncategorised'),
    fc.nat(9999).map((n) => `CAT-${n}`),
  ),
  stage: fc.constantFrom('', 'mql'),
  revenueBy: segment,
  performanceBy: segment,
  costBy: segment,
  roiBy: segment,
});

describe('the Summary report address (048 FR-004)', () => {
  it('reads back every set of own parameters it writes (FR-004)', () => {
    fc.assert(
      fc.property(params, (written) => {
        const address = writeSummaryParams(new URLSearchParams(), written);
        expect(readSummaryParams(address)).toEqual(written);
      }),
    );
  });

  it('keeps the frame parameters and leaves defaults out of the address (FR-004)', () => {
    const address = writeSummaryParams(new URLSearchParams({ year: '2027' }), DEFAULT_PARAMS);
    expect(address.toString()).toBe('year=2027');
  });

  it('drops a malformed value instead of sending it (FR-004)', () => {
    const read = readSummaryParams(
      new URLSearchParams({ category: 'cat 1', stage: 'inq', costBy: 'a/b', roiBy: 'ATTR-2' }),
    );
    expect(read).toEqual({ ...DEFAULT_PARAMS, roiBy: 'ATTR-2' });
  });

  it('names the four league tables in page order (048-C6)', () => {
    expect(TABLES.map((t) => t.param)).toEqual(['revenueBy', 'performanceBy', 'costBy', 'roiBy']);
  });
});
