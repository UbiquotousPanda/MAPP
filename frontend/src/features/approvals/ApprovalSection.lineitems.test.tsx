import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { card, NONE, renderSection } from '@/testing/fixtures/approval-screens';
import { approvalOf, roundOf, submissionOf } from '@/testing/fixtures/approvals';
import { reply } from '@/testing/replies';

const SUBMIT = 'POST /api/v1/activities/A-1042/approval/submit';
const AVAILABLE = { available: true, reason: '' };

const APPROVED_WITH_WAITING_ITEMS = approvalOf({
  status: 'approved',
  displayStatus: 'approved',
  rounds: [roundOf({ outcome: 'approved' })],
  actions: {
    submit: NONE,
    resubmit: NONE,
    approve: NONE,
    decline: NONE,
    recall: NONE,
    sendLineItems: AVAILABLE,
  },
});

const SENDING = submissionOf({
  kind: 'lineItems',
  roundNumber: 2,
  lineItems: [{ type: 'lineItem', id: 'L-1044', name: 'Catering' }],
});

const answers = [
  reply(
    'GET /api/v1/activities/{activityId}/approval/submission',
    { body: SENDING },
    { activityId: 'A-1042' },
  ),
  reply(
    'POST /api/v1/activities/{activityId}/approval/submit',
    { body: APPROVED_WITH_WAITING_ITEMS },
    { activityId: 'A-1042' },
  ),
];

describe('Send line items for approval (feature 053, US2)', () => {
  it('offers Send line items for approval on an Approved activity (FR-008, scenario 2)', async () => {
    renderSection({ body: APPROVED_WITH_WAITING_ITEMS });

    expect(
      await within(card()).findByRole('button', { name: 'Send line items for approval' }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(card());
  });

  it('names the line items before sending them, then sends with the version shown (scenarios 2, 3)', async () => {
    const { user, api } = renderSection({ body: APPROVED_WITH_WAITING_ITEMS }, answers);

    await user.click(
      await within(card()).findByRole('button', { name: 'Send line items for approval' }),
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: "Send line items of 'Launch film' for approval?",
    });
    expect(dialog).toHaveTextContent(
      'The activity stays Approved. These line items go to the approvers:',
    );
    expect(within(dialog).getByText('L-1044 · Catering')).toBeInTheDocument();
    expect(api.bodiesOf(SUBMIT)).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Send for approval' }));

    expect(
      await screen.findByText("Line items of 'Launch film' sent for approval"),
    ).toBeInTheDocument();
    expect(api.bodiesOf(SUBMIT)).toEqual([{ version: 3 }]);
  });

  it('offers nothing to send when every line item is approved (scenario 6)', async () => {
    renderSection({
      body: approvalOf({
        status: 'approved',
        displayStatus: 'approved',
        rounds: [roundOf({ outcome: 'approved' })],
        actions: { submit: NONE, resubmit: NONE, approve: NONE, decline: NONE, recall: NONE },
      }),
    });

    await within(card()).findByText('Approval workflow: Lubricants EU approval');
    expect(within(card()).queryByRole('button', { name: /approval/ })).not.toBeInTheDocument();
  });
});
