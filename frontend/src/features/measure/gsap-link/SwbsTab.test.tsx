import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { swbsReport } from './gsap-link-fixture';
import { SwbsTab } from './SwbsTab';

function renderTab(report = swbsReport()) {
  if (!report.swbs) {
    throw new Error('The fixture has no SWBS tab.');
  }
  const onChange = vi.fn();
  const rendered = renderWithProviders(
    <SwbsTab
      tab={report.swbs}
      total={report.total}
      table={{ tab: 'swbs', sort: '-waiting', page: 1, pageSize: 20 }}
      onChange={onChange}
    />,
    { route: '/reports/gsap-link', user: testUser(), path: '/reports/gsap-link' },
  );
  return { onChange, ...rendered };
}

describe('SwbsTab (044 US1, FR-005 – FR-007)', () => {
  it('shows the cards and each line item with its path, owner, code and waiting time', async () => {
    renderTab();

    const summary = screen.getByLabelText('Summary');
    expect(within(summary).getByText('Waiting')).toBeInTheDocument();
    expect(within(summary).getByText('Over 48 hours')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Waiting for SWBS code' });
    expect(within(table).getAllByText('FY2026 Lubricants › Launch › Retail › Stand')).toHaveLength(
      2,
    );
    expect(within(table).getByText('7 days')).toBeInTheDocument();
    expect(within(table).getByText('30 hours')).toBeInTheDocument();
    expect(within(table).getByText('Over 48 hours')).toBeInTheDocument();
    expect(within(table).getByText('GB01')).toBeInTheDocument();
  });

  it('marks lateness as a warning chip, not a red figure, and names the table export (FR-006)', () => {
    renderTab();

    const summary = screen.getByLabelText('Summary');
    expect(within(summary).getByText('Past turnaround')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Export Waiting for SWBS code' }),
    ).toBeInTheDocument();
  });

  it('shows only a short empty state when no line item waits (FR-005)', () => {
    const report = swbsReport();
    if (!report.swbs) {
      throw new Error('The fixture has no SWBS tab.');
    }
    renderTab(swbsReport({ swbs: { ...report.swbs, waiting: 0, overTurnaround: 0, rows: [] } }));

    expect(screen.getByText('Nothing is waiting for an SWBS code')).toBeInTheDocument();
    expect(screen.queryByLabelText('Summary')).not.toBeInTheDocument();
  });

  it('draws Waiting by time with a table view that adds up to Waiting (FR-007, SC-006)', async () => {
    const { user } = renderTab();

    expect(screen.getByRole('list', { name: 'Line items by waiting time' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Table' }));

    const bands = screen.getByRole('table', { name: 'Waiting by time' });
    expect(within(bands).getByRole('row', { name: '48 hours or less 1' })).toBeInTheDocument();
    expect(within(bands).getByRole('row', { name: 'Total 2' })).toBeInTheDocument();
  });

  it('sorts by a column, longest waiting first for waiting and dates', async () => {
    const { user, onChange } = renderTab();

    await user.click(screen.getByRole('button', { name: 'Waiting' }));
    expect(onChange).toHaveBeenLastCalledWith({ sort: 'waiting' });
    await user.click(screen.getByRole('button', { name: 'Approved on' }));
    expect(onChange).toHaveBeenLastCalledWith({ sort: '-approvedAt' });
  });
});
