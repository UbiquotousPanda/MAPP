import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { closestTo } from '@/testing/dom';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { waitingReport } from './gsap-link-fixture';
import { WaitingTab } from './WaitingTab';

function renderTab(report = waitingReport()) {
  if (!report.waiting) {
    throw new Error('The fixture has no Waiting for GSAP tab.');
  }
  const onChange = vi.fn();
  const rendered = renderWithProviders(
    <WaitingTab
      tab={report.waiting}
      finance={report.finance}
      total={report.total}
      table={{ tab: 'waiting', sort: '-waiting', page: 1, pageSize: 20 }}
      onChange={onChange}
    />,
    { route: '/reports/gsap-link?tab=waiting', user: testUser(), path: '/reports/gsap-link' },
  );
  return { onChange, ...rendered };
}

describe('WaitingTab (044 US2, FR-004, FR-008 – FR-010, FR-016)', () => {
  it('lists each request with its routing, GSAP PR number and working days, opening the request', async () => {
    renderTab();

    const table = screen.getByRole('table', { name: 'Waiting for GSAP' });
    expect(
      within(table).getByRole('link', { name: 'PR for Agency fee (Ireland)' }),
    ).toHaveAttribute('href', '/purchase-requests/PR-1001');
    expect(within(table).getByText('3 working days')).toBeInTheDocument();
    expect(within(table).getByText('Over 2 working days')).toBeInTheDocument();
    expect(within(table).getByText('Modification')).toBeInTheDocument();
    expect(within(table).getByText('1000123')).toBeInTheDocument();
  });

  it('shows amounts only where the person may see financial data, and says what they cover (FR-004)', () => {
    renderTab();

    const topUp = screen.getByRole('row', { name: /Top-up for Booth/ });
    expect(within(topUp).getByText('—', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('Covers 1 of 2 plans')).toBeInTheDocument();
  });

  it("ends with the tab's Total row: the API's amount over every page (039 FR-035)", () => {
    const report = waitingReport();
    if (!report.waiting) {
      throw new Error('The fixture has no Waiting for GSAP tab.');
    }
    renderTab(
      waitingReport({
        waiting: { ...report.waiting, amount: { amount: '99000.00', currency: 'EUR' } },
      }),
    );

    const total = closestTo(screen.getByRole('rowheader', { name: 'Total' }), 'tr');
    expect(total.closest('tfoot')).not.toBeNull();
    expect(within(total).getByText('€99,000.00')).toBeInTheDocument();
  });

  it('shows the three cards (FR-010)', () => {
    renderTab();

    const summary = screen.getByLabelText('Summary');
    expect(within(summary).getByText('Amount waiting')).toBeInTheDocument();
    expect(within(summary).getByText('Over 2 working days')).toBeInTheDocument();
  });

  it('sorts by any column, the path and the GSAP PR number included (FR-015)', async () => {
    const { user, onChange } = renderTab();

    await user.click(screen.getByRole('button', { name: 'Vendor' }));
    expect(onChange).toHaveBeenLastCalledWith({ sort: 'vendor' });
    await user.click(screen.getByRole('button', { name: 'GSAP PR number' }));
    expect(onChange).toHaveBeenLastCalledWith({ sort: 'gsapPrNumber' });
    await user.click(screen.getByRole('button', { name: 'Plan › Activity' }));
    expect(onChange).toHaveBeenLastCalledWith({ sort: 'plan' });
  });

  it('says when no request waits, with no strip of zeros (FR-008)', () => {
    const report = waitingReport();
    if (!report.waiting) {
      throw new Error('The fixture has no Waiting for GSAP tab.');
    }
    renderTab(
      waitingReport({
        total: 0,
        waiting: { ...report.waiting, waiting: 0, overTurnaround: 0, amount: null, rows: [] },
      }),
    );

    expect(screen.getByText('Nothing is waiting for GSAP')).toBeInTheDocument();
    expect(screen.queryByLabelText('Summary')).not.toBeInTheDocument();
  });
});
