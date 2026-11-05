import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { purchaseRequest } from '@/testing/fixtures/purchase-requests';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { PurchaseRequestTimeline } from './PurchaseRequestTimeline';

describe('PurchaseRequestTimeline', () => {
  it('032 timeline: a reached step shows its who and the next step says what it waits for', () => {
    renderWithProviders(<PurchaseRequestTimeline purchaseRequest={purchaseRequest()} />, {
      user: testUser(),
    });

    expect(screen.getByText(/Priya Raman/)).toBeInTheDocument();
    const next = screen.getByText('Waiting for submission').closest('li');
    expect(next).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/Priya Raman/).closest('li')).not.toHaveAttribute('aria-current');
  });

  it('032 timeline: the GSAP steps show calendar dates, not times', () => {
    const gsap = { id: 'gsap', name: 'GSAP' };
    const timeline = [
      { key: 'gsapPrNumber', label: 'GSAP PR number', reached: true, at: '2026-11-03T00:00:00Z' },
      { key: 'purchaseOrder', label: 'Purchase order', reached: true, at: '2026-11-04T00:00:00Z' },
      { key: 'invoiced', label: 'Invoiced', reached: true, at: '2026-11-10T00:00:00Z' },
      { key: 'paid', label: 'Paid', reached: true, at: '2026-11-24T00:00:00Z' },
    ].map((step, i) => ({ ...step, by: gsap, detail: i < 2 ? `450000${i}` : '', waiting: '' }));
    renderWithProviders(
      <PurchaseRequestTimeline purchaseRequest={purchaseRequest({ timeline })} />,
      {
        user: testUser(),
      },
    );

    expect(screen.getByText('03 Nov 2026 · GSAP · 4500000')).toBeInTheDocument();
    expect(screen.getByText('04 Nov 2026 · GSAP · 4500001')).toBeInTheDocument();
    expect(screen.getByText('10 Nov 2026 · GSAP')).toBeInTheDocument();
    expect(screen.getByText('24 Nov 2026 · GSAP')).toBeInTheDocument();
  });

  it('032 timeline: a later re-approval shows on the day it was in the viewer’s time zone', () => {
    const timeline = [
      {
        key: 'approved',
        label: 'Approved',
        reached: true,
        at: '2026-11-20T10:00:00Z',
        by: { id: 'u-daniel', name: 'Daniel Okoro' },
        detail: '',
        waiting: '',
        reapprovedAt: '2026-11-25T20:00:00Z',
      },
    ];
    const original = process.env.TZ;
    process.env.TZ = 'Asia/Kolkata';
    try {
      renderWithProviders(
        <PurchaseRequestTimeline purchaseRequest={purchaseRequest({ timeline })} />,
        { user: testUser() },
      );
    } finally {
      process.env.TZ = original;
    }

    expect(
      screen.getByText('20 Nov 2026, 15:30 · Daniel Okoro · change re-approved 26 Nov 2026'),
    ).toBeInTheDocument();
  });
});
