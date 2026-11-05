import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderDialog } from '@/testing/fixtures/approval-screens';
import { approvalOf, LEVEL_1, LEVEL_2, roundOf } from '@/testing/fixtures/approvals';
import { reply } from '@/testing/replies';
import { HELD_BACK } from './line-item-choices';

const APPROVE = 'POST /api/v1/activities/A-1042/approval/approve';
const usd = (amount: string) => ({ amount, currency: 'USD' });

const WITH_LINE_ITEMS = approvalOf({
  lineItems: [
    { id: 'L-1', name: 'Venue hire', plannedCost: usd('1000.00'), heldBack: false },
    { id: 'L-2', name: 'Catering', plannedCost: usd('250.00'), heldBack: false },
  ],
});

const approved = reply(
  'POST /api/v1/activities/{activityId}/approval/approve',
  { body: approvalOf({ status: 'approved', displayStatus: 'approved' }) },
  { activityId: 'A-1042' },
);

describe('DecisionDialog: ticking line items (feature 053, US1)', () => {
  it('lists the round’s line items ticked and approves only those left ticked (FR-001, scenario 2)', async () => {
    const { user, api } = renderDialog({ mode: 'approve', approval: WITH_LINE_ITEMS }, [approved]);
    const venue = screen.getByRole('checkbox', { name: 'L-1 · Venue hire' });
    const catering = screen.getByRole('checkbox', { name: 'L-2 · Catering' });
    expect(venue).toBeChecked();
    expect(catering).toBeChecked();
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Unticked line items stay Not approved',
    );
    await expectNoAxeViolations();

    await user.click(catering);
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(api.bodiesOf(APPROVE)).toEqual([
        { roundId: 'AR-1001', level: 1, approvedLineItemIds: ['L-1'] },
      ]),
    );
  });

  it('shows a line item held back at an earlier level unticked, locked and why (FR-002, scenario 3)', () => {
    renderDialog({
      mode: 'approve',
      approval: approvalOf({
        lineItems: [{ id: 'L-2', name: 'Catering', plannedCost: usd('250.00'), heldBack: true }],
      }),
    });

    const catering = screen.getByRole('checkbox', { name: 'L-2 · Catering' });
    expect(catering).not.toBeChecked();
    expect(catering).toBeDisabled();
    expect(screen.getByText(HELD_BACK)).toBeInTheDocument();
  });

  it('names a round for line items and what its last level does (US2 scenario 4)', () => {
    renderDialog({
      mode: 'approve',
      approval: approvalOf({
        status: 'approved',
        rounds: [
          roundOf({
            currentLevel: 2,
            lineItemIds: ['L-2'],
            levels: [
              { ...LEVEL_1, state: 'approved' },
              { ...LEVEL_2, state: 'waiting' },
            ],
          }),
        ],
        lineItems: [{ id: 'L-2', name: 'Catering', plannedCost: usd('250.00'), heldBack: false }],
        viewer: { isOwner: false, isCurrentApprover: true, onBehalfOf: [] },
      }),
    });

    const dialog = screen.getByRole('alertdialog', {
      name: "Approve line items of 'Launch film'?",
    });
    expect(dialog).toHaveTextContent(
      'This is the last level — the ticked line items become Approved.',
    );
  });

  it('says a declined round for line items leaves the activity Approved (US2 scenario 5)', () => {
    renderDialog({
      mode: 'decline',
      approval: approvalOf({ status: 'approved', rounds: [roundOf({ lineItemIds: ['L-2'] })] }),
    });

    expect(
      screen.getByRole('alertdialog', { name: "Decline line items of 'Launch film'?" }),
    ).toHaveTextContent(
      'The activity stays Approved. Its line items stay Not approved, and its owner can send them again.',
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('says which line item is no longer waiting when the selection is refused (FR-002)', async () => {
    const message =
      'Line item L-2 is not waiting for this approval. Reload the page and try again.';
    const { user } = renderDialog({ mode: 'approve', approval: WITH_LINE_ITEMS }, [
      reply(
        'POST /api/v1/activities/{activityId}/approval/approve',
        {
          status: 400,
          body: {
            error: {
              code: 'validation_failed',
              message: 'Some fields need your attention.',
              fields: [{ field: 'approvedLineItemIds', message }],
            },
          },
        },
        { activityId: 'A-1042' },
      ),
    ]);

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});
