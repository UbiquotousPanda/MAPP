import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { performanceSource, reviewRow } from '@/testing/fixtures/performance';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { choose } from '@/testing/select';
import type { Answer } from '@/testing/replies';
import { ReviewQueuePage } from './ReviewQueuePage';

const LIST = 'GET /api/v1/performance/review-rows';
const PATH = '/settings/performance-data/review';

function renderQueue(answer: Answer<typeof LIST>, route = PATH) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/performance/sources', { body: { items: [performanceSource()] } }),
    reply(LIST, answer),
  ]);
  return {
    api,
    ...renderWithProviders(<ReviewQueuePage />, { user: testUser(), route, path: PATH }),
  };
}

function askedFilters(api: ReturnType<typeof renderQueue>['api']) {
  const asked = api.requests.filter((r) => r.path === '/api/v1/performance/review-rows').at(-1);
  return Object.fromEntries(new URLSearchParams(asked?.search));
}

describe('ReviewQueuePage', () => {
  it('046 FR-023 FR-019 lists open rejected and unmatched rows with their reason', async () => {
    const { api } = renderQueue({
      body: {
        items: [
          reviewRow(),
          reviewRow({
            id: 'PRR-1002',
            reason: 'unmatched:disagree',
            candidates: ['A-1001', 'A-1002'],
          }),
          reviewRow({ id: 'PRR-1003', reason: 'rejected:futureDate' }),
        ],
      },
    });

    expect(await screen.findByRole('button', { name: 'No activity has this key' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Keys disagree' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Rejected: the date is in the future' }),
    ).toBeVisible();
    expect(screen.getByText('3 rows')).toBeVisible();
    expect(screen.getByText(/none can be added by hand/)).toBeVisible();
    expect(askedFilters(api)).toEqual({ status: 'open' });
    await expectNoAxeViolations();
  });

  it('046 FR-023 finds rows by key, reason, source, status, upload and date through the API', async () => {
    const { api } = renderQueue(
      { body: { items: [reviewRow({ status: 'dismissed' })] } },
      `${PATH}?key=A-1O42&reason=unmatched%3Aunknown&sourceId=PS-1001&status=dismissed&importId=PIM-1001&since=2026-10-01&until=2026-10-31`,
    );

    await screen.findByRole('button', { name: 'No activity has this key' });
    expect(askedFilters(api)).toEqual({
      key: 'A-1O42',
      reason: 'unmatched:unknown',
      sourceId: 'PS-1001',
      status: 'dismissed',
      importId: 'PIM-1001',
      since: '2026-10-01',
      until: '2026-10-31',
    });
    expect(screen.getByText('1 row from import PIM-1001')).toBeVisible();
  });

  it('046 FR-023 choosing a reason asks the API for that reason only', async () => {
    const { api, user } = renderQueue({ body: { items: [reviewRow()] } });

    await choose(user, await screen.findByRole('combobox', { name: 'Reason' }), 'Keys disagree');

    expect(askedFilters(api)).toEqual({ status: 'open', reason: 'unmatched:disagree' });
  });

  it('046 FR-023 says there is nothing to review when no row waits', async () => {
    renderQueue({ body: { items: [] } });

    expect(await screen.findByText('Nothing to review')).toBeVisible();
  });

  it('046 FR-023 offers Clear filters when the filters hide every row', async () => {
    const { user, router } = renderQueue({ body: { items: [] } }, `${PATH}?status=any&key=nothing`);

    expect(await screen.findByText('Nothing matches these filters')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(router.state.location.search).toBe('');
  });

  it('046 FR-043 shows No access with the server reason to someone without performance.import', async () => {
    renderQueue({
      status: 403,
      body: apiError('forbidden', "Loading performance data isn't part of your role (Viewer)."),
    });

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeVisible();
    expect(
      screen.getByText("Loading performance data isn't part of your role (Viewer)."),
    ).toBeVisible();
  });

  it('046 FR-024 FR-019 opens a row with its cells, problems and named candidates', async () => {
    const { user, router } = renderQueue({
      body: {
        items: [
          reviewRow({
            reason: 'unmatched:disagree',
            candidates: ['A-1001', 'A-1002'],
            faults: [
              {
                column: 'Date',
                code: 'futureDate',
                message: 'A row cannot be dated in the future.',
              },
            ],
          }),
        ],
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Keys disagree' }));

    const panel = await screen.findByRole('dialog', { name: 'Keys disagree' });
    expect(within(panel).getByRole('link', { name: 'A-1001' })).toBeVisible();
    expect(within(panel).getByRole('link', { name: 'A-1002' })).toBeVisible();
    expect(within(panel).getByText('Date: A row cannot be dated in the future.')).toBeVisible();
    expect(within(panel).getByRole('rowheader', { name: 'Activity' })).toBeVisible();
    expect(router.state.location.search).toBe('?row=PRR-1001');
    await expectNoAxeViolations();
  });
});
