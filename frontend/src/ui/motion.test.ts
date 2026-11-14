import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollBehavior } from './motion';

function prefersLessMotion(less: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && less,
    media: query,
  }));
}

describe('scrollBehavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('glides to a jumped-to section or field', () => {
    prefersLessMotion(false);
    expect(scrollBehavior()).toBe('smooth');
  });

  it('jumps at once for people who prefer less motion (WCAG 2.3.3)', () => {
    prefersLessMotion(true);
    expect(scrollBehavior()).toBe('auto');
  });
});
