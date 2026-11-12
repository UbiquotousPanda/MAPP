import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { approvalOf } from '@/testing/fixtures/approvals';
import { launchFilm } from '@/testing/fixtures/activities';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { ActivityHeader } from './ActivityHeader';

function renderHeader(approval: ReturnType<typeof approvalOf>) {
  renderWithProviders(
    <ActivityHeader
      activity={launchFilm({ status: 'created' })}
      approval={approval}
      moreActions={[]}
      onOpenReady={() => {}}
      onShowProblems={() => {}}
    />,
    { user: testUser() },
  );
}

describe('the activity header follows the approval answer when the activity read is older', () => {
  it('offers Approve and Decline when the approval says it is submitted to this approver', () => {
    const viewer = { isOwner: false, isSubmitter: false, isCurrentApprover: true, onBehalfOf: [] };
    renderHeader(
      approvalOf({ status: 'submitted', viewer: { ...approvalOf().viewer, ...viewer } }),
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });
});
