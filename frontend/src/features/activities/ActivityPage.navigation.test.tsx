import { configure, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HISTORY_ANSWERS } from '@/testing/fixtures/activity-log';
import { approvalOf } from '@/testing/fixtures/approvals';
import { activityRecord } from '@/testing/fixtures/line-item-financials';
import { mockApi } from '@/testing/mock-api';
import { activitySection } from '@/testing/fixtures/purchase-requests';
import type { Answer } from '@/testing/replies';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { launchFilm } from '@/testing/fixtures/activities';
import { activity, launchFilmSection } from '@/testing/fixtures/line-items';
import { currentRates } from '@/testing/fixtures/line-item-forms';
import { activityAttributeForm, editForm } from '@/testing/fixtures/activity-forms';
import { reply } from '@/testing/replies';
import { ActivityPage } from './ActivityPage';

configure({ asyncUtilTimeout: 10_000 });

const PATH = '/plans/:planId/activities/:activityId';

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

function openPage(
  answer: Answer<'GET /api/v1/activities/{activityId}'>,
  route = '/plans/P-1001/activities/A-1042',
) {
  mockApi([
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
          revenue: { goal: null, actual: null, excludedCount: 0, reason: 'notApproved' },
          webMetrics: [],
          sources: [],
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
    reply(
      'GET /api/v1/activities/{activityId}/approval',
      { body: NOT_SUBMITTED },
      { activityId: 'A-1042' },
    ),
    reply('GET /api/v1/exchange-rates/current', { body: currentRates() }),
    reply(
      'GET /api/v1/activities/{activityId}/line-items',
      { body: launchFilmSection({ activity: activity({ id: 'A-1042' }) }) },
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
  return renderWithProviders(<ActivityPage />, { route, path: PATH, user: testUser() });
}

describe('ActivityPage (feature 006, US2): tabs and deep links', () => {
  it('shows the summary, then the tabs Overview · Details · Approval · History (design system §2.4 B, FR-020)', async () => {
    const { user, router } = openPage({ body: launchFilm({ externalName: '' }) });

    await screen.findByRole('heading', { level: 1, name: 'Launch film' });
    const tabs = screen.getByRole('tablist', { name: 'Activity' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Overview', 'Details', 'Approval', 'History']);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    const ready = screen.getByRole('region', { name: 'Ready to submit' });
    const financials = screen.getByRole('region', { name: 'Financials' });
    const lineItems = screen.getByRole('region', { name: 'Line items' });
    expect(
      screen.getByRole('region', { name: 'Summary' }).compareDocumentPosition(ready) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      ready.compareDocumentPosition(financials) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      financials.compareDocumentPosition(lineItems) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(financials.id).toBe('financials');
    expect(await within(financials).findByText('82,000.00 USD')).toBeVisible();
    expect(screen.queryByText('From finance (coming later)')).not.toBeInTheDocument();
    expect(lineItems.closest('#line-items')).not.toBeNull();
    expect(screen.queryByRole('region', { name: 'Details' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Details' }));
    expect(await screen.findByRole('region', { name: 'Details' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Shell attributes' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Goals' })).toBeVisible();
    expect(router.state.location.search).toBe('?tab=details');

    await user.click(screen.getByRole('tab', { name: 'Approval' }));
    expect(
      (await screen.findByRole('region', { name: 'Approval' })).closest('#approval'),
    ).not.toBeNull();

    await user.click(screen.getByRole('tab', { name: 'History' }));
    const history = await screen.findByRole('region', { name: 'History' });
    expect(history.closest('#history')).not.toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Include line items' })).not.toBeChecked();

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('opens the tab of a #part: #approval from Home and the notifications', async () => {
    openPage({ body: launchFilm() }, '/plans/P-1001/activities/A-1042#approval');

    expect(await screen.findByRole('region', { name: 'Approval' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Approval' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the History tab and focuses its heading for View history', async () => {
    const { user, router } = openPage({ body: launchFilm() });

    await user.click(await screen.findByRole('button', { name: 'Actions for Launch film' }));
    await user.click(await screen.findByRole('menuitem', { name: 'View history' }));

    await waitFor(() => expect(router.state.location.search).toBe('?tab=history'));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'History' })).toHaveFocus(),
    );
  });

  it('replaces an address with another plan by the right one', async () => {
    const { router } = openPage({ body: launchFilm() }, '/plans/P-9999/activities/A-1042#ready');

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/plans/P-1001/activities/A-1042'),
    );
    expect(router.state.location.hash).toBe('#ready');
  });

  it('opens Ready to submit for the Show fields link of Home (#completeness, feature 009)', async () => {
    openPage({ body: launchFilm() }, '/plans/P-1001/activities/A-1042#completeness');

    const panel = await screen.findByRole('region', { name: 'Ready to submit' });
    await waitFor(() => expect(panel).toHaveFocus());
  });
});
