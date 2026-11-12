import { configure, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HISTORY_ANSWERS } from '@/testing/fixtures/activity-log';
import { approvalOf, submissionOf } from '@/testing/fixtures/approvals';
import { activityRecord } from '@/testing/fixtures/line-item-financials';
import { closestTo } from '@/testing/dom';
import { mockApi } from '@/testing/mock-api';
import { activitySection } from '@/testing/fixtures/purchase-requests';
import type { Answer } from '@/testing/replies';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { FIVE_PROBLEMS, incompleteLaunchFilm, launchFilm } from '@/testing/fixtures/activities';
import { activity, launchFilmSection } from '@/testing/fixtures/line-items';
import { currentRates } from '@/testing/fixtures/line-item-forms';
import { activityAttributeForm, editForm } from '@/testing/fixtures/activity-forms';
import { reply } from '@/testing/replies';
import { ActivityPage } from './ActivityPage';

// The whole form renders in each test: on a busy computer the first render can take a while.
configure({ asyncUtilTimeout: 10_000 });

const PATH = '/plans/:planId/activities/:activityId';

/** The approval of a Created activity the viewer owns: nothing to decide (feature 008). */
const NOT_SUBMITTED = approvalOf({
  status: 'created',
  displayStatus: 'created',
  rounds: [],
  actions: {
    submit: { available: true, reason: '' },
    resubmit: { available: false, reason: '' },
    approve: { available: false, reason: '' },
    decline: { available: false, reason: '' },
    recall: { available: false, reason: '' },
  },
});

/** What Submit for approval finds for "Launch film": five problems (feature 008). */
const FIVE_MISSING = submissionOf({
  ready: false,
  problems: [...FIVE_PROBLEMS.activity, ...FIVE_PROBLEMS.lineItems].map((problem) => ({
    field: problem.field,
    group: problem.lineItemId ? ('lineItem' as const) : ('activity' as const),
    lineItemId: problem.lineItemId ?? '',
    message: problem.message,
  })),
});

function openPage(
  answer: Answer<'GET /api/v1/activities/{activityId}'>,
  route = '/plans/P-1001/activities/A-1042',
  approval: Answer<'GET /api/v1/activities/{activityId}/approval'> = { body: NOT_SUBMITTED },
) {
  const api = mockApi([
    ...HISTORY_ANSWERS,
    reply(
      'GET /api/v1/activities/{activityId}/media-codes',
      { body: { requiresCodes: false, items: [] } },
      { activityId: 'A-1042' },
    ),
    reply(
      'GET /api/v1/activities/{activityId}/performance',
      {
        body: {
          state: 'notApproved',
          stages: [],
          revenue: {
            goal: null,
            actual: null,
            excludedCount: 0,
            reason: 'notApproved',
            projected: null,
            projectedReason: '',
            months: [],
          },
          webMetrics: [],
          sources: [],
          projection: null,
        },
      },
      { activityId: 'A-1042' },
    ),
    reply('GET /api/v1/activities/{activityId}/performance/sources', {
      body: {
        externalName: '',
        aliases: [],
        mediaCodeCount: 0,
        integrated: false,
        goalEntered: false,
        sources: [],
      },
    }),
    reply('GET /api/v1/activities/{activityId}', answer, { activityId: 'A-1042' }),
    reply('GET /api/v1/activities/{activityId}/approval', approval, { activityId: 'A-1042' }),
    reply('GET /api/v1/exchange-rates/current', { body: currentRates() }),
    reply(
      'GET /api/v1/activities/{activityId}/line-items',
      { body: launchFilmSection({ activity: activity({ id: 'A-1042' }) }) },
      { activityId: 'A-1042' },
    ),
    reply(
      'GET /api/v1/activities/{activityId}/approval/submission',
      { body: FIVE_MISSING },
      { activityId: 'A-1042' },
    ),
    reply(
      'GET /api/v1/financials/records/{recordId}',
      {
        body: activityRecord({ record: { type: 'activity', id: 'A-1042', name: 'Launch film' } }),
      },
      { recordId: 'A-1042' },
    ),
    reply(
      'GET /api/v1/activities/{activityId}/form',
      { body: editForm() },
      { activityId: 'A-1042' },
    ),
    reply(
      'GET /api/v1/shell-attribute-forms/{level}',
      { body: activityAttributeForm() },
      { level: 'activity' },
    ),
    reply('GET /api/v1/activities/{activityId}/purchase-requests', {
      body: activitySection({ activityId: 'A-1042', lineItems: [] }),
    }),
  ]);
  return { ...renderWithProviders(<ActivityPage />, { route, path: PATH, user: testUser() }), api };
}

describe('ActivityPage (feature 006, US2)', () => {
  it('shows status, completeness, ID, owner, dates, planned cost and unassigned planned cost (FR-019 – FR-021)', async () => {
    openPage({ body: incompleteLaunchFilm({ owner: launchFilm().owner }) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Launch film' })).toBeVisible();
    expect(document.title).toBe('Launch film · SP&A One');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(
      within(breadcrumb)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Plans', 'FY2026 Lubricants Europe', 'Helix launch', 'Digital & social']);
    expect(screen.getByText('ACTIVITY')).toBeVisible();
    expect(screen.getByText('Created')).toBeVisible();
    expect(screen.getByRole('button', { name: '3 fields needed' })).toBeVisible();
    expect(screen.getByRole('button', { name: '1 line item needs attention' })).toBeVisible();
    expect(screen.getByText('A-1042')).toBeVisible();
    const header = screen.getByRole('banner');
    expect(within(header).getByText('Priya Raman')).toBeVisible();
    expect(within(header).getByText('01 Mar – 31 May 2026')).toBeVisible();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('$120,000.00')).toBeVisible();
    expect(within(summary).getByText('$20,000.00')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Edit' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/plans/P-1001/activities/A-1042/edit',
    );
    expect(screen.getByRole('button', { name: 'Actions for Launch film' })).toBeVisible();
  });

  it('shows the planned and unassigned cost in the reader’s display currency (D-220)', async () => {
    openPage({
      body: launchFilm({
        display: {
          plannedCost: { amount: '110400.00', currency: 'EUR' },
          unassignedPlannedCost: { amount: '18400.00', currency: 'EUR' },
          revenue: null,
        },
      }),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Launch film' })).toBeVisible();
    // The plan currency first, the reader's currency beside it (016 FR-013).
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('$120,000.00')).toBeVisible();
    expect(within(summary).getByText(/≈ €110,400.00/)).toBeVisible();
    expect(within(summary).getByText(/≈ €18,400.00/)).toBeVisible();
  });

  it('marks an unassigned planned cost below zero in red words', async () => {
    openPage({
      body: launchFilm({ unassignedPlannedCost: { amount: '-500.00', currency: 'USD' } }),
    });

    expect(await screen.findByText('Line items exceed the planned cost by $500.00')).toBeVisible();
  });

  it('says that a cost or date change restarts the approval of an approved activity (FR-027)', async () => {
    openPage({ body: launchFilm({ status: 'approved', displayStatus: 'inProgress' }) });

    expect(
      await screen.findByText(
        'In progress — changing planned cost or dates will restart approval.',
      ),
    ).toBeVisible();
    expect(screen.getByText('In progress')).toBeVisible();
  });

  it('opens Ready to submit and says how many things are missing when submitting finds problems (FR-025)', async () => {
    const { user } = openPage({ body: incompleteLaunchFilm() });

    const summary = closestTo(await screen.findByText('Submitting needs 5 things'), 'summary');
    const panel = screen.getByRole('region', { name: 'Ready to submit' });
    const owner = within(panel).getByRole('link', { name: 'Owner — needed to submit' });
    expect(owner).toBeVisible();
    await user.click(summary);
    expect(owner).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Submit for approval' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Submitting needs 5 things — view list');
    expect(owner).toBeVisible();
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it('links the activities of a split, "(deleted)" without a link (016 FR-031)', async () => {
    openPage({
      body: launchFilm({
        splitFrom: { id: 'A-1012', name: 'UK launch event', planId: 'P-1001', deleted: false },
        splitInto: [{ id: 'A-1014', name: 'Ireland roadshow', planId: 'P-1001', deleted: true }],
      }),
    });

    expect(
      await screen.findByRole('link', { name: "Split from 'UK launch event' (A-1012)" }),
    ).toHaveAttribute('href', '/plans/P-1001/activities/A-1012');
    expect(screen.getByText("Split into 'Ireland roadshow' (A-1014) (deleted)")).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /Split into 'Ireland roadshow'/ }),
    ).not.toBeInTheDocument();
  });

  it('shows grey shapes while loading', async () => {
    openPage(() => new Promise(() => {}));

    expect(await screen.findAllByText('Loading…')).not.toHaveLength(0);
  });

  it('says when the activity no longer exists', async () => {
    openPage({
      status: 404,
      body: {
        error: {
          code: 'not_found',
          message: 'This activity no longer exists — someone may have deleted it.',
          fields: [],
        },
      },
    });

    expect(
      await screen.findByText('This activity no longer exists — someone may have deleted it.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to Plans' })).toBeVisible();
  });

  it('offers Try again when the activity cannot be loaded', async () => {
    openPage({
      status: 500,
      body: { error: { code: 'internal_error', message: 'Broken', fields: [] } },
    });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
