import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import {
  noPurchaseRequestsReport,
  purchaseRequestsReport,
} from '@/testing/fixtures/purchase-requests-report';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { CardsRow } from './CardsRow';
import { CommitmentChart } from './CommitmentChart';
import { StatusWidget } from './StatusWidget';

const options = (route = '/reports/purchase-requests') => ({
  route,
  user: testUser(),
  path: '/reports/purchase-requests',
});
const report = purchaseRequestsReport();

describe('CardsRow (042 FR-006)', () => {
  it('shows the five figures in one strip, naming what Committed counts', async () => {
    renderWithProviders(<CardsRow data={report.cards} />, options());

    const strip = screen.getByRole('region', { name: 'Summary' });
    expect(
      within(strip).getByText('Committed by approved purchase requests').nextSibling?.textContent,
    ).toBe('$3,800.00');
    expect(within(strip).getByText('Invoiced').nextSibling?.textContent).toBe('$700.00');
    expect(within(strip).getByText('Vendors').nextSibling?.textContent).toBe('4');
    expect(screen.queryByRole('group', { name: /Show .* as/ })).toBeNull();
    await expectNoAxeViolations();
  });

  it('shows a loading skeleton', () => {
    renderWithProviders(<CardsRow />, options());

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows nothing when the report failed, as the widgets below offer Try again', () => {
    renderWithProviders(<CardsRow failed />, options());

    expect(screen.queryByText('Loading…')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Summary' })).toBeNull();
  });
});

describe('StatusWidget (042 FR-007)', () => {
  it('shows the six statuses with count, share and amount, and how many wait for GSAP', async () => {
    renderWithProviders(<StatusWidget data={report.statusMix} />, options());

    expect(screen.getByText('9 purchase requests · 1 waiting for GSAP')).toBeInTheDocument();
    expect(screen.getByText('In review')).toBeInTheDocument();
    expect(screen.getByText('4 · 45 % · $400.00')).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('lists the same figures in the table view, with the total', () => {
    renderWithProviders(
      <StatusWidget data={report.statusMix} />,
      options('/reports/purchase-requests?table=status'),
    );

    const rows = screen.getAllByRole('row').map((r) => r.textContent);
    expect(rows[0]).toBe('StatusCountAmountShare');
    expect(rows.at(-1)).toBe('Total9$4,780.00100 %');
  });

  it('shows an error with Try again', async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(<StatusWidget failed onRetry={onRetry} />, options());

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('CommitmentChart (042 FR-010 – FR-013)', () => {
  it('names the series, draws each month with its total, and says what the bars are', async () => {
    renderWithProviders(
      <CommitmentChart
        widget="byVendor"
        title="Commitment by vendor"
        rowLabel="Vendor"
        data={report.byVendor}
      />,
      options(),
    );

    expect(screen.getByRole('list', { name: 'Series' }).textContent).toBe('GlobexAcme');
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(5);
    await expectNoAxeViolations();
  });

  it('lists every vendor and the totals in the table view', () => {
    renderWithProviders(
      <CommitmentChart
        widget="byVendor"
        title="Commitment by vendor"
        rowLabel="Vendor"
        data={report.byVendor}
      />,
      options('/reports/purchase-requests?table=byVendor'),
    );

    const rows = screen.getAllByRole('row').map((r) => r.textContent);
    expect(rows[1]).toBe('Globex$0.00$2,000.00$0.00$2,000.00');
    expect(rows.at(-1)).toBe('Total$1,300.00$2,000.00$500.00$3,800.00');
  });

  it('says nothing is committed yet', () => {
    renderWithProviders(
      <CommitmentChart
        widget="byOwner"
        title="Commitment by owner"
        rowLabel="Owner"
        data={noPurchaseRequestsReport().byOwner}
      />,
      options(),
    );

    expect(screen.getByText(/Nothing is committed yet/)).toBeInTheDocument();
  });
});
