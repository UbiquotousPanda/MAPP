import { describe, expect, it } from 'vitest';
import { redirectOf } from './redirects';

describe('redirectOf', () => {
  it.each([
    [
      '/reports/revenue',
      '?year=2026&group=owner',
      '/reports/performance?year=2026&group=owner&stage=revenue',
    ],
    ['/reports/funnel', '?stage=mql&year=2026', '/reports/performance?year=2026&stage=mql'],
    [
      '/reports/summary',
      '?year=2026&stage=mql&roiBy=ATTR-3&category=c1',
      '/reports/performance?year=2026&category=c1',
    ],
    ['/reports/plan-budget', '?year=2026&sort=actual', '/reports/budget?year=2026&sort=actual'],
    ['/reports/purchase-requests', '?vendor=V-1', '/reports/purchasing?vendor=V-1&tab=requests'],
    [
      '/reports/gsap-link',
      '?tab=orders&sort=-poDate',
      '/reports/purchasing?sort=-poDate&tab=orders',
    ],
    ['/reports/plan-details', '', '/reports/plan-data?tab=completeness'],
    ['/reports/user-access', '?team=T-1', '/reports/plan-data?team=T-1&tab=people'],
  ])(
    'moves %s%s to its new home with its filters (059 FR-009, US3-1, US3-2)',
    (path, search, want) => {
      expect(redirectOf(path, search)).toBe(want);
    },
  );
});
