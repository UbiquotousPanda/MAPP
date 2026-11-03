import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { components } from '@/api/generated/schema';
import { expectNoAxeViolations } from '@/testing/axe';
import { LOADER, performanceLoad, performanceSource } from '@/testing/fixtures/performance';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { findMessages, renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import type { CurrentUser } from '@/session/useSession';
import { ImportSummaryPage } from './ImportSummaryPage';

type Load = components['schemas']['PerformanceImport'];
const UNDO = 'POST /api/v1/performance/imports/{importId}/undo';

function renderPage(load: Load, user: CurrentUser = testUser()) {
  const api = mockApi([
    reply('GET /api/v1/performance/sources', { body: { items: [performanceSource()] } }),
    reply('GET /api/v1/performance/imports/{importId}', { body: load }),
    reply(UNDO, { body: { ...load, status: 'undone', version: 2 } }),
  ]);
  return {
    api,
    ...renderWithProviders(<ImportSummaryPage />, {
      user,
      route: `/settings/performance-data/imports/${load.id}`,
      path: '/settings/performance-data/imports/:importId',
    }),
  };
}

describe('ImportSummaryPage', () => {
  it('046 FR-022 shows rows read and the five counts the API gave, and the same per measure', async () => {
    renderPage(performanceLoad());

    const table = await screen.findByRole('table', { name: 'Rows read and what became of them' });
    const all = within(
      within(table).getByRole('rowheader', { name: 'All rows' }).closest('tr') ?? table,
    );
    expect(all.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '20',
      '12',
      '3',
      '1',
      '2',
      '2',
    ]);
    const inq = within(
      within(table).getByRole('rowheader', { name: 'INQ' }).closest('tr') ?? table,
    );
    expect(inq.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '18',
      '11',
      '3',
      '1',
      '1',
      '2',
    ]);
    expect(
      screen.getByText(
        'It read 20 rows: 12 matched, 3 held, 1 unattributed, 2 rejected and 2 unmatched.',
      ),
    ).toBeVisible();
    expect(screen.getByText(/An import can't be edited/)).toBeVisible();
    await expectNoAxeViolations();
  });

  it('046 FR-017 states the counts and what changes before undoing, then undoes', async () => {
    const { api, user } = renderPage(performanceLoad());

    await user.click(await screen.findByRole('button', { name: 'Undo import' }));
    const confirm = await screen.findByRole('alertdialog', {
      name: "Undo import 'eloqua-october.csv'?",
    });
    expect(confirm).toHaveTextContent(
      'It read 20 rows: 12 matched, 3 held, 1 unattributed, 2 rejected and 2 unmatched.',
    );
    expect(confirm).toHaveTextContent('recalculated');
    expect(confirm).toHaveTextContent('stays listed as Undone');
    expect(api.requests.some((r) => r.method === 'POST')).toBe(false);
    await expectNoAxeViolations();

    await user.click(within(confirm).getByRole('button', { name: 'Undo import' }));

    expect(await findMessages()).toHaveTextContent("Import 'eloqua-october.csv' undone");
    expect(
      api.requests.filter((r) => r.path === '/api/v1/performance/imports/PIM-1001/undo'),
    ).toHaveLength(1);
  });

  it('046 FR-017 Cancel keeps the import as it was', async () => {
    const { api, user } = renderPage(performanceLoad());

    await user.click(await screen.findByRole('button', { name: 'Undo import' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(api.requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('046 FR-043 046-C16 says only an administrator can undo, to someone who may only load', async () => {
    renderPage(performanceLoad(), LOADER);

    expect(await screen.findByText('Only an administrator can undo an import.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Undo import' })).not.toBeInTheDocument();
  });

  it('046 FR-017 an undone import stays listed as Undone and offers no second undo', async () => {
    renderPage(
      performanceLoad({
        status: 'undone',
        updatedBy: { id: 'U-1001', name: 'Alex Morgan' },
        updatedAt: '2026-10-29T10:00:00Z',
      }),
    );

    expect(await screen.findByText(/Undone by Alex Morgan on/)).toBeVisible();
    expect(screen.getAllByText('Undone').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Undo import' })).not.toBeInTheDocument();
  });
});
