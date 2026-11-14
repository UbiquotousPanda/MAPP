import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { components } from '@/api/generated/schema';
import { expectNoAxeViolations } from '@/testing/axe';
import { ELOQUA_MAPPINGS, performanceSource, reviewRow } from '@/testing/fixtures/performance';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { ReviewQueuePage } from './ReviewQueuePage';

type Row = components['schemas']['ReviewRow'];
const PATH = '/settings/performance-data/review';
const DISMISS = 'POST /api/v1/performance/review-rows/{rowId}/dismiss';
const CORRECT = 'POST /api/v1/performance/review-rows/{rowId}/correct';

interface Answers {
  dismiss?: Answer<typeof DISMISS>;
  correct?: Answer<typeof CORRECT>;
}

function renderRow(row: Row, answers: Answers = {}) {
  const api = mockApi([
    reply('GET /api/v1/performance/sources', { body: { items: [performanceSource()] } }),
    reply('GET /api/v1/performance/sources/{sourceId}/mappings', {
      body: { items: ELOQUA_MAPPINGS },
    }),
    reply('GET /api/v1/performance/review-rows', { body: { items: [row] } }),
    reply(DISMISS, answers.dismiss ?? { body: { ...row, status: 'dismissed' } }),
    reply(CORRECT, answers.correct ?? { body: { ...row, status: 'resolved' } }),
    reply('POST /api/v1/performance/review-rows/{rowId}/reopen', {
      body: { ...row, status: 'open' },
    }),
  ]);
  const rendered = renderWithProviders(<ReviewQueuePage />, {
    user: testUser(),
    route: `${PATH}?status=any&row=${row.id}`,
    path: PATH,
  });
  return { api, ...rendered };
}

async function choose(user: ReturnType<typeof renderRow>['user'], action: string) {
  const panel = await screen.findByRole('dialog', { name: 'No activity has this key' });
  await user.click(within(panel).getByRole('button', { name: action }));
}

describe('Review row actions', () => {
  it('046 FR-024 dismissing asks for the required comment before anything is sent', async () => {
    const { api, user } = renderRow(reviewRow());
    await choose(user, 'Dismiss');

    const dialog = await screen.findByRole('dialog', { name: 'Dismiss row' });
    await user.click(within(dialog).getByRole('button', { name: 'Dismiss row' }));

    expect(await within(dialog).findByText('Say why this row is being dismissed.')).toBeVisible();
    expect(within(dialog).getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(api.requests.some((r) => r.method === 'POST')).toBe(false);
    await expectNoAxeViolations();
  });

  it('046 FR-024 shows the API refusal of a dismissal on the comment field', async () => {
    const refusal = apiError('validation_failed', 'Check the highlighted field.', {
      fields: [{ field: 'comment', message: 'Say why this row is being dismissed.' }],
    });
    const { user } = renderRow(reviewRow(), { dismiss: { status: 400, body: refusal } });
    await choose(user, 'Dismiss');
    const dialog = await screen.findByRole('dialog', { name: 'Dismiss row' });

    await user.type(within(dialog).getByRole('textbox'), 'x');
    await user.click(within(dialog).getByRole('button', { name: 'Dismiss row' }));

    expect(await within(dialog).findByText('Say why this row is being dismissed.')).toBeVisible();
  });

  it('046 FR-024 dismisses the row with its comment', async () => {
    const { api, user } = renderRow(reviewRow());
    await choose(user, 'Dismiss');
    const dialog = await screen.findByRole('dialog', { name: 'Dismiss row' });

    await user.type(within(dialog).getByRole('textbox'), 'A test row from the vendor.');
    await user.click(within(dialog).getByRole('button', { name: 'Dismiss row' }));

    expect(await screen.findByText('Row dismissed', { exact: false })).toBeInTheDocument();
    expect(api.bodiesOf('POST /api/v1/performance/review-rows/PRR-1001/dismiss')).toEqual([
      { comment: 'A test row from the vendor.' },
    ]);
  });

  it('046 FR-024 Escape closes the dismissal without saving', async () => {
    const { api, user } = renderRow(reviewRow());
    await choose(user, 'Dismiss');
    await screen.findByRole('dialog', { name: 'Dismiss row' });

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Dismiss row' })).not.toBeInTheDocument(),
    );
    expect(api.requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('046 FR-024 reopens a dismissed row and shows why it was dismissed', async () => {
    const { api, user } = renderRow(
      reviewRow({ status: 'dismissed', comment: 'Vendor test row.' }),
    );

    const panel = await screen.findByRole('dialog', { name: 'No activity has this key' });
    expect(within(panel).getByText('Vendor test row.')).toBeVisible();
    expect(within(panel).queryByRole('button', { name: 'Correct' })).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Reopen' }));

    expect(await screen.findByText('Row reopened', { exact: false })).toBeInTheDocument();
    expect(api.requests.filter((r) => r.path.endsWith('/PRR-1001/reopen'))).toHaveLength(1);
  });

  it('046 FR-024 corrects a mistyped key, sends only what changed, and says the row now counts', async () => {
    const { api, user } = renderRow(reviewRow());
    await choose(user, 'Correct');
    const dialog = await screen.findByRole('dialog', { name: 'Correct row' });

    const key = await within(dialog).findByRole('textbox', { name: /^Activity/ });
    expect(key).toHaveValue('A-1O42');
    await user.clear(key);
    await user.type(key, 'A-1042{Enter}');

    expect(
      await screen.findByText('Row corrected and matched', { exact: false }),
    ).toBeInTheDocument();
    expect(api.bodiesOf('POST /api/v1/performance/review-rows/PRR-1001/correct')).toEqual([
      { keys: { activityId: 'A-1042' }, version: reviewRow().version },
    ]);
  });

  it('046 FR-024 a correction that still does not match says what is still wrong', async () => {
    const { user } = renderRow(reviewRow(), {
      correct: { body: reviewRow({ reason: 'unmatched:ambiguous' }) },
    });
    await choose(user, 'Correct');
    const dialog = await screen.findByRole('dialog', { name: 'Correct row' });

    await user.type(await within(dialog).findByRole('textbox', { name: /^INQ/ }), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Correct and re-check' }));

    expect(
      await screen.findByText('Row corrected, still to review: The key fits several activities', {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('046 FR-024 a correction that changes nothing says so instead of sending', async () => {
    const { api, user } = renderRow(reviewRow());
    await choose(user, 'Correct');
    const dialog = await screen.findByRole('dialog', { name: 'Correct row' });

    await within(dialog).findByRole('textbox', { name: /^Activity/ });
    await user.click(within(dialog).getByRole('button', { name: 'Correct and re-check' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Change at least one cell');
    expect(api.requests.some((r) => r.method === 'POST')).toBe(false);
  });
});
