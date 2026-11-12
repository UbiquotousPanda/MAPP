import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { CATEGORIES } from '@/testing/fixtures/activity-categories';
import { dealB, dealC, webinarDeals } from '@/testing/fixtures/deals';
import { reportFrame } from '@/testing/fixtures/reports';
import { revenueRanked, revenueReport } from '@/testing/fixtures/revenue';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import type { MockedApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { choose } from '@/testing/select';
import { RevenueReport } from '../RevenueReport';

const DEALS = 'GET /api/v1/reports/revenue/activities/{activityId}/deals';
const DEALS_PATH = '/api/v1/reports/revenue/activities/A-1001/deals';
const usd = (amount: string) => ({ amount, currency: 'USD' });

// The ranked fixture's activity row says $240,000.00, so a panel that agrees says the same.
const AGREEING = { credited: usd('240000.00') };

function renderPage(
  deals: Answer<typeof DEALS> = { body: webinarDeals(AGREEING) },
  route = '/reports/revenue?year=2026',
) {
  const api = mockApi([
    reply('GET /api/v1/me', { body: testUser() }),
    reply('GET /api/v1/reports/frame', { body: reportFrame() }),
    reply('GET /api/v1/reports/{report}/views', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/settings/activity-categories', { body: CATEGORIES }),
    reply('GET /api/v1/reports/revenue', { body: revenueReport() }),
    reply('GET /api/v1/reports/revenue/ranked', { body: revenueRanked() }),
    reply('GET /api/v1/reports/{report}/export', () => new Response('file')),
    reply(DEALS, deals),
  ]);
  const rendered = renderWithProviders(<RevenueReport />, {
    route,
    user: testUser(),
    path: '/reports/revenue',
  });
  return { ...rendered, api };
}

const dealsRequests = (api: MockedApi) =>
  api.requests.filter((r) => r.path === DEALS_PATH).map((r) => new URLSearchParams(r.search));

async function openFromTheRow(user: ReturnType<typeof renderPage>['user']) {
  const button = await screen.findByRole('button', { name: /^Attributed revenue of Launch film/ });
  await user.click(button);
  return { button, panel: await screen.findByRole('dialog', { name: 'Launch film' }) };
}

describe('DealsPanel (058 US1)', () => {
  it('opens the deals from the attributed revenue, lists them with their journeys, and is accessible (scenarios 1, 8)', async () => {
    const { user, api } = renderPage();

    const { button, panel } = await openFromTheRow(user);

    await waitFor(() => expect(dealsRequests(api)).toHaveLength(1));
    expect(dealsRequests(api)[0]?.get('year')).toBe('2026');
    expect(within(panel).getByText('Credited to this activity')).toBeInTheDocument();
    expect(within(panel).getByText('$240,000.00')).toBeInTheDocument();
    expect(within(panel).getByText('Booked on this activity').nextElementSibling).toHaveTextContent(
      '—',
    );
    const euro = within(panel).getByRole('article', { name: 'Measure demo feed · MD-013' });
    expect(
      within(euro).getByText(/booked on Helix search and social, first half/),
    ).toBeInTheDocument();
    expect(within(euro).getByText(/= \$20,108\.70 at 0\.92/)).toBeInTheDocument();
    const steps = within(euro).getByRole('list', { name: 'Journey' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    expect(within(steps).getByText('This activity')).toBeInTheDocument();
    expect(within(steps).getByText('Deal booked')).toBeInTheDocument();
    expect(
      within(panel).getByText(/someone who can open other plans may see different shares/),
    ).toBeInTheDocument();
    await expectNoAxeViolations();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  it('reopens from the address, so a link or Back brings the panel back (FR-007)', async () => {
    const { router } = renderPage(
      { body: webinarDeals() },
      '/reports/revenue?year=2026&deals=A-1001',
    );

    const panel = await screen.findByRole('dialog');
    expect(await within(panel).findByText('$18,702.90')).toBeInTheDocument();
    expect(router.state.location.search).toContain('deals=A-1001');
  });

  it('shows the activity name at once while the deals load (FR-018)', async () => {
    const { user } = renderPage(() => new Promise<Response>(() => {}));

    const { panel } = await openFromTheRow(user);

    expect(within(panel).getByLabelText('Loading the deals')).toBeInTheDocument();
  });

  it('names why nothing credits an activity not approved yet, with no $0.00 credited (FR-019)', async () => {
    const { user } = renderPage({
      body: webinarDeals({ deals: [], total: 0, credited: usd('0.00'), reason: 'notApproved' }),
    });

    const { panel } = await openFromTheRow(user);

    expect(await within(panel).findByText("This activity isn't approved yet")).toBeInTheDocument();
    expect(within(panel).getByText(/facts are held until it is approved/)).toBeInTheDocument();
    expect(
      within(panel).getByText('Credited to this activity').nextElementSibling,
    ).toHaveTextContent(/^—$/);
  });

  it('says "No data has arrived yet" when no deal of the year touches the activity (FR-019)', async () => {
    const { user } = renderPage({
      body: webinarDeals({ deals: [], total: 0, credited: usd('0.00'), reason: '' }),
    });

    const { panel } = await openFromTheRow(user);

    expect(await within(panel).findByText('No data has arrived yet')).toBeInTheDocument();
    expect(within(panel).getByText(/credits or was booked on this activity/)).toBeInTheDocument();
  });

  it('opens on the activity heading, with the one close button (scenario 8)', async () => {
    const { user } = renderPage();

    const { panel } = await openFromTheRow(user);

    await waitFor(() => expect(within(panel).getByRole('heading', { level: 2 })).toHaveFocus());
    expect(within(panel).getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });

  it('fails on its own and tries again (FR-020)', async () => {
    const { user, api } = renderPage({
      status: 500,
      body: apiError('internal_error', 'Something went wrong.'),
    });

    const { panel } = await openFromTheRow(user);

    expect(await within(panel).findByText("We couldn't load the deals.")).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(dealsRequests(api)).toHaveLength(2));
  });

  it('says when the activity cannot be found, the same for one outside the scope (FR-016)', async () => {
    const { user } = renderPage({
      status: 404,
      body: apiError('not_found', "We can't find this activity."),
    });

    const { panel } = await openFromTheRow(user);

    expect(await within(panel).findByText("We can't find this activity.")).toBeInTheDocument();
  });

  it('counts the held facts and the deals left out for a missing rate (FR-012, FR-021)', async () => {
    const { user } = renderPage({
      body: webinarDeals({ ...AGREEING, heldFacts: 2, withoutRate: 1 }),
    });

    const { panel } = await openFromTheRow(user);

    expect(
      await within(panel).findByText(/2 facts wait for their activity's approval/),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/1 deal is left out: no exchange rate/)).toBeInTheDocument();
  });

  it('notices figures that changed since the report loaded and refreshes it (FR-013)', async () => {
    const { user, api } = renderPage({ body: webinarDeals() });

    const { panel } = await openFromTheRow(user);

    expect(
      await within(panel).findByText('These figures changed since the report loaded.'),
    ).toBeInTheDocument();
    const rankedBefore = api.requests.filter(
      (r) => r.path === '/api/v1/reports/revenue/ranked',
    ).length;
    await user.click(within(panel).getByRole('button', { name: 'Refresh the report' }));
    await waitFor(() =>
      expect(
        api.requests.filter((r) => r.path === '/api/v1/reports/revenue/ranked').length,
      ).toBeGreaterThan(rankedBefore),
    );
    await waitFor(() =>
      expect(
        within(panel).queryByText('These figures changed since the report loaded.'),
      ).not.toBeInTheDocument(),
    );
  });

  it('compares with another model for this activity only (US2 scenario 1)', async () => {
    const compared = webinarDeals({
      ...AGREEING,
      comparison: {
        key: 'lastTouch',
        name: 'Last touch',
        description: 'All the revenue goes to the last activity before the conversion.',
      },
      comparisonCredited: usd('44108.70'),
      deals: [
        { ...dealB(), comparisonShare: usd('24000.00') },
        { ...dealC(), comparisonShare: usd('20108.70') },
      ],
    });
    const { user, api } = renderPage((request) =>
      new URL(request.url).searchParams.get('compare') === 'lastTouch'
        ? { body: compared }
        : { body: webinarDeals(AGREEING) },
    );

    const { panel } = await openFromTheRow(user);
    await choose(user, within(panel).getByRole('combobox', { name: 'Compare with' }), 'Last touch');

    await waitFor(() => expect(dealsRequests(api).at(-1)?.get('compare')).toBe('lastTouch'));
    expect(await within(panel).findByText('$44,108.70 under Last touch')).toBeInTheDocument();
    expect(within(panel).getByText('$24,000.00 under Last touch')).toBeInTheDocument();
  });

  it('exports the deals as the widget "deals" of the Revenue export (US3 scenario 1)', async () => {
    URL.createObjectURL = () => 'blob:export';
    URL.revokeObjectURL = () => {};
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user, api } = renderPage();

    const { panel } = await openFromTheRow(user);
    await user.click(within(panel).getByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('menuitem', { name: 'CSV (.csv)' }));

    const exports = () =>
      api.requests
        .filter((r) => r.path === '/api/v1/reports/revenue/export')
        .map((r) => new URLSearchParams(r.search));
    await waitFor(() => expect(exports()).toHaveLength(1));
    expect(exports()[0]?.get('widget')).toBe('deals');
    expect(exports()[0]?.get('activity')).toBe('A-1001');
    expect(exports()[0]?.get('format')).toBe('csv');
    save.mockRestore();
  });

  it('leaves the currency to the display currency and shows its figures (scenario 4, 039-C10)', async () => {
    const { user, api } = renderPage(
      { body: webinarDeals({ credited: { amount: '17206.67', currency: 'EUR' } }) },
      '/reports/revenue?year=2026&currency=EUR',
    );

    const { panel } = await openFromTheRow(user);

    await waitFor(() => expect(dealsRequests(api)).toHaveLength(1));
    expect(dealsRequests(api)[0]?.get('currency')).toBeNull();
    expect(await within(panel).findByText('€17,206.67')).toBeInTheDocument();
  });
});
