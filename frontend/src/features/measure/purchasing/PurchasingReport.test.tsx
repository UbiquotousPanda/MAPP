import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import {
  noPurchaseRequestsReport,
  purchaseRequestsReport,
} from '@/testing/fixtures/purchase-requests-report';
import { reportFrame } from '@/testing/fixtures/reports';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import type { MockedApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { choose } from '@/testing/select';
import { ordersReport, swbsReport, waitingReport } from '../gsap-link/gsap-link-fixture';
import { PurchasingReport } from './PurchasingReport';

const GSAP = '/api/v1/reports/gsap-link';
const OVERVIEW = [
  'Purchase requests by status',
  'Committed by approved purchase requests, by vendor',
  'Committed by approved purchase requests, by owner',
];

interface Answers {
  requests?: Answer<'GET /api/v1/reports/purchase-requests'>;
  gsap?: Answer<'GET /api/v1/reports/gsap-link'>;
}

function renderPage(route = '/reports/purchasing', answers: Answers = {}) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: reportFrame({ report: 'purchasing' }) }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply(
      'GET /api/v1/reports/purchase-requests',
      answers.requests ?? { body: purchaseRequestsReport() },
    ),
    reply('GET /api/v1/reports/gsap-link', answers.gsap ?? { body: swbsReport() }),
    reply('GET /api/v1/reports/{report}/export', () => new Response('file')),
  ]);
  const rendered = renderWithProviders(<PurchasingReport />, {
    route,
    user: testUser(),
    path: '/reports/purchasing',
  });
  return { api, ...rendered };
}

const last = (api: MockedApi, path: string) =>
  new URLSearchParams(api.requests.filter((r) => r.path === path).at(-1)?.search);

describe('PurchasingReport (059 US2, FR-005)', () => {
  it('opens on the overview and the Purchase requests grid', async () => {
    renderPage();

    for (const name of OVERVIEW) {
      expect(await screen.findByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 1, name: 'Purchasing' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Purchase requests' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('searchbox', { name: 'Search purchase requests' })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it.each([
    ['Waiting for SWBS code', 'swbs', swbsReport()],
    ['Waiting for GSAP', 'waiting', waitingReport()],
    ['Purchase orders', 'orders', ordersReport()],
  ])(
    'shows %s under the overview, the tab in the address and the request',
    async (name, tab, body) => {
      const { api, router, user } = renderPage('/reports/purchasing?sort=amount&page=2', {
        gsap: { body },
      });
      await screen.findByRole('heading', { level: 2, name: OVERVIEW[0] });

      await user.click(screen.getByRole('tab', { name }));

      expect(await screen.findByRole('table', { name })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: OVERVIEW[0] })).toBeInTheDocument();
      expect(router.state.location.search).toBe(`?tab=${tab}`);
      expect(last(api, GSAP).get('tab')).toBe(tab);
    },
  );

  it('exports the tab shown', async () => {
    URL.createObjectURL = () => 'blob:export';
    URL.revokeObjectURL = () => {};
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { api, user } = renderPage('/reports/purchasing?tab=orders', {
      gsap: { body: ordersReport() },
    });
    await screen.findByRole('table', { name: 'Purchase orders' });

    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() =>
      expect(last(api, '/api/v1/reports/purchasing/export').get('tab')).toBe('orders'),
    );
    save.mockRestore();
  });

  it('says when the tab of the address is no longer offered, and shows Purchase requests', async () => {
    renderPage('/reports/purchasing?tab=gsap');

    expect(await screen.findByText('This view changed')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Purchase requests' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('starts a GSAP tab on page 1 when a filter changes, keeping its sort', async () => {
    const { router } = renderPage('/reports/purchasing?tab=swbs&sort=lineItem&page=3');
    await screen.findByRole('table', { name: 'Waiting for SWBS code' });

    await router.navigate('/reports/purchasing?tab=swbs&sort=lineItem&page=3&planType=strategic');

    await waitFor(() => expect(router.state.location.search).not.toContain('page=3'));
    expect(router.state.location.search).toContain('sort=lineItem');
  });

  it("keeps a GSAP tab's sort and page size in the address", async () => {
    const { api, router, user } = renderPage('/reports/purchasing?tab=swbs&page=2');
    const table = await screen.findByRole('table', { name: 'Waiting for SWBS code' });

    await user.click(within(table).getByRole('button', { name: 'Line item' }));
    await choose(user, screen.getByRole('combobox', { name: 'Rows per page' }), '100');

    expect(router.state.location.search).toBe('?tab=swbs&sort=lineItem&pageSize=100');
    expect(last(api, GSAP).get('pageSize')).toBe('100');
  });

  it('asks the GSAP tab for 50 rows when the address names a size no longer offered (D-432)', async () => {
    const { api } = renderPage('/reports/purchasing?tab=swbs&pageSize=20');
    await screen.findByRole('table', { name: 'Waiting for SWBS code' });

    expect(last(api, GSAP).get('pageSize')).toBe('50');
  });

  it('says the year has no purchase requests, pointing to the purchase orders tab', async () => {
    renderPage('/reports/purchasing', { requests: { body: noPurchaseRequestsReport() } });

    expect(await screen.findByText('No purchase requests in 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See GSAP purchase orders' })).toHaveAttribute(
      'href',
      '/reports/purchasing?tab=orders',
    );
    expect(screen.queryByRole('heading', { name: OVERVIEW[0] })).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('says purchase requests are not switched on', async () => {
    renderPage('/reports/purchasing', {
      requests: { body: purchaseRequestsReport({ purchaseSupport: false }) },
    });

    expect(await screen.findByText('Purchase requests aren’t switched on')).toBeInTheDocument();
  });

  it('offers Try again when the purchase requests cannot be read', async () => {
    renderPage('/reports/purchasing', {
      requests: { status: 500, body: apiError('internal_error', 'Something went wrong.') },
    });

    expect((await screen.findAllByRole('button', { name: 'Try again' })).length).toBeGreaterThan(0);
  });
});
