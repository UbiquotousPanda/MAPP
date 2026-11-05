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
});
