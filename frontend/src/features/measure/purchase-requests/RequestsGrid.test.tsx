import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { closestTo } from '@/testing/dom';
import { purchaseRequestsGrid } from '@/testing/fixtures/purchase-requests-report';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { choose } from '@/testing/select';
import { RequestsGrid } from './RequestsGrid';
import type { RequestsGridProps } from './RequestsGrid';
import { DEFAULT_PARAMS } from './schemas';

function renderGrid(props: Partial<RequestsGridProps> = {}, route = '/reports/purchasing') {
  const onParams = vi.fn();
  const rendered = renderWithProviders(
    <RequestsGrid
      grid={purchaseRequestsGrid()}
      params={DEFAULT_PARAMS}
      onParams={onParams}
      {...props}
    />,
    { route, user: testUser(), path: '/reports/purchasing' },
  );
  return { ...rendered, onParams };
}

describe('RequestsGrid (042 US2)', () => {
  it('opens a vendor to its requests and a request to its lines and line items', async () => {
    const { user } = renderGrid();

    expect(screen.getByText('Acme · 1 requests, 2 lines')).toBeInTheDocument();
    expect(screen.queryByText('Event stand')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Open Acme' }));
    expect(screen.getByRole('link', { name: 'Event stand' })).toHaveAttribute(
      'href',
      '/purchase-requests/PR-1001',
    );
    await user.click(screen.getByRole('button', { name: 'Open Event stand' }));

    expect(screen.getByText('Stand build · Spring launch')).toBeInTheDocument();
    expect(screen.getByText('Stand transport')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close Acme' }));
    expect(screen.queryByText('Stand build · Spring launch')).toBeNull();
  });

  it('shows a dash for a line with no purchase order, delivery date or invoice', async () => {
    const { user } = renderGrid();
    await user.click(screen.getByRole('button', { name: 'Open Acme' }));
    await user.click(screen.getByRole('button', { name: 'Open Event stand' }));

    const row = screen.getByRole('row', { name: /Stand transport/ });

    expect(within(row).getAllByText('—').length).toBeGreaterThanOrEqual(5);
  });

  it('keeps the chosen columns and their order', () => {
    renderGrid({ params: { ...DEFAULT_PARAMS, columns: ['status', 'name', 'amount'] } });

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Open or close',
      'Status',
      'Name',
      'Amount',
    ]);
  });

  it('shows, hides and moves columns through the chooser, and resets them', async () => {
    const { user, onParams } = renderGrid({
      params: { ...DEFAULT_PARAMS, columns: ['status', 'name', 'amount'] },
    });

    await user.click(screen.getByText('Columns'));
    await user.click(screen.getByRole('checkbox', { name: 'Amount' }));
    await user.click(screen.getByRole('button', { name: 'Move Name left' }));
    await user.click(screen.getByRole('button', { name: 'Reset columns' }));

    expect(onParams).toHaveBeenCalledWith({ columns: ['status', 'name'], page: 1 });
    expect(onParams).toHaveBeenCalledWith({ columns: ['name', 'status', 'amount'], page: 1 });
    expect(onParams.mock.calls.at(-1)?.[0].columns).toHaveLength(13);
  });

  it('042 FR-016: says why the last shown column cannot be hidden', async () => {
    const { user } = renderGrid({ params: { ...DEFAULT_PARAMS, columns: ['name'] } });

    await user.click(screen.getByText('Columns'));

    const last = screen.getByRole('checkbox', { name: 'Name' });
    expect(last).toBeDisabled();
    expect(last).toHaveAccessibleDescription('At least one column stays shown.');
  });

  it('sorts by the column of the heading pressed', async () => {
    const { user, onParams } = renderGrid({
      params: { ...DEFAULT_PARAMS, sort: 'amount', order: 'asc' },
    });

    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await user.click(screen.getByRole('button', { name: 'Delivery date' }));

    expect(onParams).toHaveBeenCalledWith({ sort: 'delivery', order: 'asc' });
  });

  it('filters by vendor, owner and status behind Filters (n), and searches after a pause in typing', async () => {
    const { user, onParams } = renderGrid({
      params: { ...DEFAULT_PARAMS, vendors: ['Acme'], statuses: ['inReview'] },
    });

    expect(screen.getByRole('button', { name: /^Filters/ })).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: /^Vendor/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'Not filled in' }));
    expect(onParams).toHaveBeenCalledWith({ vendors: ['Acme', 'none'] });
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /^Owner/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'Alice Ng' }));
    expect(onParams).toHaveBeenCalledWith({ requestOwners: ['p-alice'] });
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Remove filter: Status: In review' }));
    expect(onParams).toHaveBeenCalledWith({ statuses: [] });
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onParams).toHaveBeenCalledWith({ vendors: [], requestOwners: [], statuses: [] });
    await user.type(screen.getByRole('searchbox', { name: 'Search purchase requests' }), 'stand');
    await waitFor(() => expect(onParams).toHaveBeenCalledWith({ q: 'stand' }));
  });

  it('pages by vendors and changes the page size', async () => {
    const { user, onParams } = renderGrid({
      grid: { ...purchaseRequestsGrid(), total: 60, page: 2, pageSize: 25 },
    });

    expect(screen.getByText('26–50 of 60')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await choose(user, screen.getByRole('combobox', { name: 'Rows per page' }), '10');

    expect(onParams).toHaveBeenCalledWith({ page: 3 });
    expect(onParams).toHaveBeenCalledWith({ pageSize: 10 });
  });

  it('lists the page in the table view, then the Total row', () => {
    renderGrid({}, '/reports/purchasing?table=grid');

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(6);
    expect(rows.at(-1)?.textContent).toMatch(/^Total 1 requests, 2 lines/);
  });

  it("ends with the API's Total row over every page, headed Total before the columns (042 FR-029, 039 FR-035)", () => {
    const totals = {
      purchaseRequests: 41,
      lines: 77,
      committed: { amount: '98765.00', currency: 'USD' },
      invoiced: null,
    };
    renderGrid({
      grid: { ...purchaseRequestsGrid(), total: 60, page: 2, totals },
      params: { ...DEFAULT_PARAMS, columns: ['status', 'name', 'amount', 'invoiced'] },
    });

    const total = closestTo(screen.getByRole('rowheader', { name: 'Total' }), 'tr');
    expect(total.closest('tfoot')).not.toBeNull();
    expect([...total.querySelectorAll('td, th')].map((c) => c.textContent)).toEqual([
      'Total',
      '',
      '41 requests, 77 lines',
      '$98,765.00',
      '—',
    ]);
  });

  it('says there are no purchase requests yet when nothing is filtered', () => {
    renderGrid({ grid: { ...purchaseRequestsGrid(), vendors: [], total: 0 } });

    expect(screen.getByText(/No purchase requests yet/)).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: /^Total/ })).not.toBeInTheDocument();
  });

  it('offers Reset filters when the filters exclude everything', async () => {
    const { user, onParams } = renderGrid({
      grid: { ...purchaseRequestsGrid(), vendors: [], total: 0 },
      params: { ...DEFAULT_PARAMS, q: 'zzz' },
    });

    await user.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(onParams).toHaveBeenCalledWith({ q: '', vendors: [], requestOwners: [], statuses: [] });
  });

  it('names the plans whose amounts the person cannot see', () => {
    renderGrid({ covers: { plans: 1, of: 2 } });

    expect(screen.getByText(/Amounts cover 1 of 2 plans/)).toBeInTheDocument();
  });

  it('shows a loading skeleton', () => {
    renderGrid({ grid: undefined });

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows an error with Try again', () => {
    renderGrid({ grid: undefined, failed: true });

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
