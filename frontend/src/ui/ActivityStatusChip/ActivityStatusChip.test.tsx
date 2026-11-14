import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityStatusChip } from './ActivityStatusChip';

describe('ActivityStatusChip (feature 006, FR-021)', () => {
  it.each([
    ['created', 'Created'],
    ['submitted', 'Submitted'],
    ['declined', 'Declined'],
    ['approved', 'Approved'],
    ['inProgress', 'In progress'],
    ['complete', 'Complete'],
  ] as const)('shows %s as "%s"', (status, word) => {
    render(<ActivityStatusChip status={status} />);

    expect(screen.getByText(word)).toBeInTheDocument();
  });
});
