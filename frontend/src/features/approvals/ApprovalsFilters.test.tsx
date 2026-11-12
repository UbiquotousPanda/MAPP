import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { DANIEL, rowOf } from '@/testing/fixtures/approvals';
import { NO_FILTERS, applyFilters, filterChips, filterOptions } from './approval-filters';
import type { ApprovalFilterValues } from './approval-filters';
import { ApprovalsFilters } from './ApprovalsFilters';

const ROWS = [
  rowOf(),
  rowOf({
    activity: {
      id: 'A-1043',
      name: 'Spring radio',
      status: 'submitted',
      displayStatus: 'submitted',
    },
    path: [{ type: 'plan', id: 'P-1002', name: 'FY2026 Mobility China' }],
    owner: DANIEL,
    workflow: { id: 'WF-1002', name: 'China BC approval workflow', active: false },
    submittedAt: '2026-03-01T09:00:00Z',
  }),
  rowOf({
    activity: null,
    subject: {
      kind: 'purchaseRequest',
      label: 'Purchase request',
      id: 'PR-1001',
      name: 'Agency retainer',
      status: 'inReview',
      displayStatus: 'inReview',
    },
    submittedAt: '2026-03-02T09:00:00Z',
  }),
];

function Harness() {
  const [filters, setFilters] = useState<ApprovalFilterValues>(NO_FILTERS);
  const visible = applyFilters(ROWS, '', filters);
  return (
    <>
      <ApprovalsFilters filters={filters} options={filterOptions(ROWS)} onChange={setFilters} />
      <p>{visible.map((row) => row.subject.id).join(', ')}</p>
    </>
  );
}

describe('ApprovalsFilters (feature 008, FR-031)', () => {
  it('offers the plans, workflows and owners of the rows', async () => {
    const { user } = renderWithProviders(<Harness />, { user: testUser() });
    const choices = async (name: string) => {
      await user.click(screen.getByRole('button', { name }));
      const menu = await screen.findByRole('dialog', { name });
      const names = within(menu)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label') ?? radio.closest('label')?.textContent);
      await user.keyboard('{Escape}');
      return names;
    };

    expect(await choices('Plan')).toEqual([
      'Any plan',
      'FY2026 Lubricants Europe',
      'FY2026 Mobility China',
    ]);
    expect(await choices('Approval workflow')).toEqual([
      'Any workflow',
      'China BC approval workflow (inactive)',
      'Lubricants EU approval',
    ]);
    expect(await choices('Owner')).toEqual(['Anyone', 'Daniel Okoro', 'Priya Raman']);
  });

  it('filters by record type, offering only the types of the rows (031 FR-026)', async () => {
    const { user } = renderWithProviders(<Harness />, { user: testUser() });

    await user.click(screen.getByRole('button', { name: 'Record type' }));
    const menu = await screen.findByRole('dialog', { name: 'Record type' });
    expect(within(menu).getAllByRole('radio')).toHaveLength(3);
    await user.click(within(menu).getByRole('radio', { name: 'Purchase request' }));

    expect(screen.getByText('PR-1001')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Record type · Purchase request' }),
    ).toBeInTheDocument();
  });

  it('filters by the submitted dates', async () => {
    const { user } = renderWithProviders(<Harness />, { user: testUser() });

    await user.click(screen.getByRole('button', { name: 'Submitted' }));
    const menu = await screen.findByRole('dialog', { name: 'Submitted' });
    await user.type(within(menu).getByLabelText('From'), '2026-03-05');

    expect(screen.getByText('A-1042')).toBeInTheDocument();
  });

  it('names each filter in use as a chip', () => {
    const chips = filterChips(
      {
        kind: 'purchaseRequest',
        planId: 'P-1002',
        workflowId: 'WF-1002',
        ownerId: 'U-1003',
        from: '2026-03-01',
        to: '',
      },
      filterOptions(ROWS),
      (date) => date,
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      'Record type: Purchase request',
      'Plan: FY2026 Mobility China',
      'Approval workflow: China BC approval workflow (inactive)',
      'Owner: Daniel Okoro',
      'Submitted from: 2026-03-01',
    ]);
  });
});
