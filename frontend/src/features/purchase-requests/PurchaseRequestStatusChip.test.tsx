import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { PurchaseRequestStatusChip } from './PurchaseRequestStatusChip';

describe('032 FR-052: status chip', () => {
  it.each([
    ['created', false, 'Created'],
    ['submitted', false, 'Submitted'],
    ['inReview', false, 'In review'],
    ['declined', false, 'Declined'],
    ['approved', false, 'Approved'],
    ['closed', false, 'Closed'],
    ['approved', true, 'Approved · Change in review'],
  ] as const)('%s (change pending %s) reads "%s"', (status, changePending, word) => {
    mockApi([]);
    renderWithProviders(
      <PurchaseRequestStatusChip status={status} changePending={changePending} />,
      { user: testUser() },
    );

    expect(screen.getByText(word)).toBeInTheDocument();
  });
});
