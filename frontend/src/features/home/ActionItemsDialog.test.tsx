import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { reply } from '@/testing/replies';
import type { HomeActionItem } from './action-items';
import { ActionItemsDialog } from './ActionItemsDialog';

const plan = { type: 'plan', id: 'P-1001', name: 'FY2026 Lubricants Europe' };

const ITEMS: HomeActionItem[] = [
  {
    kind: 'approval',
    record: { type: 'activity', id: 'A-1045', name: 'Dealer summit' },
    plan,
    overdue: true,
    since: '2026-03-09T09:00:00Z',
  },
  {
    kind: 'purchaseRequestToFix',
    record: { type: 'purchaseRequest', id: 'PR-1002', name: 'Summit venue' },
    plan,
    overdue: false,
    since: null,
  },
  {
    kind: 'swbsRequest',
    record: { type: 'lineItem', id: 'LI-1007', name: 'Stand build' },
    plan: null,
    overdue: false,
    since: null,
  },
];

function renderDialog(show = true, items = ITEMS) {
  const api = mockApi([
    reply('GET /api/v1/home/action-items', {
      body: { items, total: items.length, show, hiddenUntil: show ? null : '2026-03-13' },
    }),
    reply('POST /api/v1/home/action-items/remind-later', { body: { hiddenUntil: '2026-03-13' } }),
  ]);
  return { api, ...renderWithProviders(<ActionItemsDialog />, { user: testUser(), path: '/' }) };
}

describe('ActionItemsDialog', () => {
  it('lists each pending action in the order the server gives, with why and a Go to link (demo-mvp #9)', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog', { name: 'Your action items' });
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining(
        'Dealer summitOverdueWaiting for your approval · FY2026 Lubricants Europe',
      ),
      expect.stringContaining(
        'Summit venueDeclined: fix it and submit it again · FY2026 Lubricants Europe',
      ),
      expect.stringContaining('Stand buildReady to send for an SWBS code'),
    ]);
    expect(within(dialog).getByRole('link', { name: 'Go to Dealer summit' })).toHaveAttribute(
      'href',
      '/plans/P-1001/activities/A-1045#approval',
    );
    expect(within(dialog).getByRole('link', { name: 'Go to Summit venue' })).toHaveAttribute(
      'href',
      '/purchase-requests/PR-1002',
    );
    expect(within(dialog).getByRole('link', { name: 'Go to Stand build' })).toHaveAttribute(
      'href',
      '/line-items/LI-1007',
    );
  });

  it('opens each record itself: an approval at its approval section, not the Approvals list (#186)', async () => {
    renderDialog(true, [
      {
        kind: 'approval',
        record: { type: 'activity', id: 'A-1045', name: 'Dealer summit' },
        plan: null,
        overdue: true,
        since: null,
      },
      {
        kind: 'approval',
        record: { type: 'purchaseRequest', id: 'PR-1004', name: 'Extra flights' },
        plan,
        overdue: false,
        since: null,
      },
      {
        kind: 'activityIncomplete',
        record: { type: 'activity', id: 'A-1038', name: 'Workshop roadshow' },
        plan,
        overdue: false,
        since: null,
      },
    ]);

    const dialog = await screen.findByRole('dialog', { name: 'Your action items' });
    const hrefs = within(dialog)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/activities/A-1045#approval',
      '/purchase-requests/PR-1004#approval',
      '/plans/P-1001/activities/A-1038',
    ]);
  });

  it('saves Remind me later on the server and closes (demo-mvp #9)', async () => {
    const { api, user } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Remind me later' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.requests.map((r) => `${r.method} ${r.path}`)).toContain(
      'POST /api/v1/home/action-items/remind-later',
    );
  });

  it('closes on Escape without saving anything (demo-mvp #9)', async () => {
    const { api, user } = renderDialog();
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('never opens when the server says there is nothing to show (demo-mvp #9)', async () => {
    const { api } = renderDialog(false, []);

    await waitFor(() =>
      expect(api.requests.map((r) => r.path)).toContain('/api/v1/home/action-items'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
