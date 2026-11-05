import { describe, expect, it } from 'vitest';
import { asOfText } from './asOf';

describe('asOfText (issue 183)', () => {
  it('reads HH:MM in the viewer’s time, never with AM or PM', () => {
    const morning = new Date(2026, 9, 20, 9, 15).toISOString();
    const evening = new Date(2026, 9, 20, 21, 5).toISOString();

    expect(asOfText(morning)).toBe('GSAP rates as of 09:15');
    expect(asOfText(evening)).toBe('GSAP rates as of 21:05');
  });
});
