import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { nth } from '@/testing/dom';
import {
  performanceLoad,
  performanceSource,
  SIMULATED_SOURCE,
} from '@/testing/fixtures/performance';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, pending, reply } from '@/testing/replies';
import { ImportsPage } from './ImportsPage';

const LIST = 'GET /api/v1/performance/imports';
const SOURCES = reply('GET /api/v1/performance/sources', {
  body: { items: [performanceSource(), SIMULATED_SOURCE] },
});

function renderPage(
  handlers: Parameters<typeof mockApi>[0],
  route = '/settings/performance-data/imports',
) {
  const api = mockApi([SOURCES, ...handlers]);
  return { api, ...renderWithProviders(<ImportsPage />, { user: testUser(), route }) };
}

describe('ImportsPage', () => {
  it('046 FR-016 lists each import with its source, uploader, rows read and status', async () => {
    renderPage([
      reply(LIST, {
        body: {
          items: [
            performanceLoad(),
            performanceLoad({
              id: 'PIM-1002',
              fileName: 'adobe-pull',
              origin: 'simulated',
              sourceId: 'PS-1002',
              status: 'undone',
            }),
          ],
        },
      }),
    ]);

    const row = (await screen.findByRole('link', { name: 'eloqua-october.csv' })).closest('tr');
    expect(row).not.toBeNull();
    const cells = within(row ?? document.body);
    expect(cells.getByText('Eloqua')).toBeInTheDocument();
    expect(cells.getByText('Alex Morgan')).toBeInTheDocument();
    expect(cells.getByText('20')).toBeInTheDocument();
    expect(cells.getByText('Completed')).toBeInTheDocument();
    const pulled = within(
      screen.getByRole('link', { name: 'adobe-pull' }).closest('tr') ?? document.body,
    );
    expect(pulled.getByText('Undone')).toBeInTheDocument();
    expect(pulled.getByText('Simulated feed')).toBeInTheDocument();
    expect(screen.getByText('2 imports')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /upload a file/i })).toHaveLength(1);
    await expectNoAxeViolations();
  });

  it('046 FR-016 finds imports by file or uploader, status, source and dates through the API', async () => {
    const { api } = renderPage(
      [reply(LIST, { body: { items: [performanceLoad()] } })],
      '/settings/performance-data/imports?search=eloqua&status=undone&sourceId=PS-1001&since=2026-10-01&until=2026-10-31',
    );

    await screen.findByRole('link', { name: 'eloqua-october.csv' });
    const asked = api.requests.find((r) => r.path === '/api/v1/performance/imports');
    const query = new URLSearchParams(asked?.search);
    expect(Object.fromEntries(query)).toEqual({
      search: 'eloqua',
      status: 'undone',
      sourceId: 'PS-1001',
      since: '2026-10-01',
      until: '2026-10-31',
    });
  });

  it('046 FR-016 says when nothing has been loaded yet', async () => {
    renderPage([reply(LIST, { body: { items: [] } })]);

    expect(await screen.findByText('No imports yet')).toBeInTheDocument();
  });

  it('046 FR-016 offers Clear filters when the filters hide every import', async () => {
    const { user, router } = renderPage(
      [reply(LIST, { body: { items: [] } })],
      '/settings/performance-data/imports?status=failed',
    );

    expect(await screen.findByText('Nothing matches these filters')).toBeInTheDocument();
    // The empty state's Clear filters, after the chips' own.
    await user.click(nth(screen.getAllByRole('button', { name: 'Clear filters' }), -1));

    expect(router.state.location.search).toBe('');
    expect(await screen.findByText('No imports yet')).toBeInTheDocument();
  });

  it('046 FR-043 shows No access with the server reason to someone without performance.import', async () => {
    renderPage([
      reply('GET /api/v1/me', { body: testUser() }),
      reply(LIST, {
        status: 403,
        body: apiError('forbidden', "Loading performance data isn't part of your role (Viewer)."),
      }),
    ]);

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    expect(
      screen.getByText("Loading performance data isn't part of your role (Viewer)."),
    ).toBeVisible();
  });

  it('046 FR-016 keeps the header while the imports are on their way', () => {
    renderPage([reply(LIST, () => pending())]);

    expect(screen.getByRole('heading', { name: 'Imports', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
