import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LineItemApprovalChip } from './LineItemApprovalChip';

describe('LineItemApprovalChip (feature 053, FR-005)', () => {
  it.each([
    ['approved', 'Approved'],
    ['notApproved', 'Not approved'],
  ] as const)('shows %s as "%s"', (approval, word) => {
    render(<LineItemApprovalChip approval={approval} />);

    expect(screen.getByText(word)).toBeInTheDocument();
  });
});
