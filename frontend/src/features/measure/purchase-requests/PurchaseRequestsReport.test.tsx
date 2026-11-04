import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { purchaseRequestsReport } from '@/testing/fixtures/purchase-requests-report';
import { reportFrame } from '@/testing/fixtures/reports';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { PurchaseRequestsReport } from './PurchaseRequestsReport';

type Frame = ReturnType<typeof reportFrame>;
type Report = ReturnType<typeof purchaseRequestsReport>;

const HEADINGS = [
  'Summary',
  'Purchase requests by status',
  'Commitment by vendor, by delivery month',
  'Commitment by owner, by delivery month',
];

function renderReport(frame: Frame | 'forbidden', report: Report = purchaseRequestsReport()) {
  const frameReply =
    frame === 'forbidden'
      ? { status: 403, body: apiError('forbidden', "Seeing reports isn't part of your role.") }
      : { body: { ...frame, report: 'purchaseRequests' as const } };
  mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/reports/frame', frameReply),
    reply('GET /api/v1/reports/purchase-requests', { body: report }),
  ]);
  return renderWithProviders(<PurchaseRequestsReport />, {
    route: '/reports/purchase-requests',
    user: testUser(),
    path: '/reports/purchase-requests',
  });
}

describe('PurchaseRequestsReport (042)', () => {
  it('shows the cards, the status mix, both charts and the grid inside the frame', async () => {
    renderReport(reportFrame());

    for (const name of HEADINGS) {
      expect(await screen.findByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 1, name: 'Purchase requests' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Period' })).toBeNull();
  });

  it('says purchase requests are not switched on', async () => {
    renderReport(reportFrame(), purchaseRequestsReport({ purchaseSupport: false }));

    expect(await screen.findByText('Purchase requests aren’t switched on')).toBeInTheDocument();
  });

  it('says there are no plans to see for the year', async () => {
    renderReport(
      reportFrame({
        inView: { plans: 0, campaigns: 0, initiatives: 0, activities: 0, lineItems: 0 },
      }),
    );

    expect(await screen.findByText('No plans you may see for 2026')).toBeInTheDocument();
  });

  it('shows the standard no-access page without "See reports"', async () => {
    renderReport('forbidden');

    expect(await screen.findByRole('heading', { name: /access/i })).toBeInTheDocument();
  });
});
