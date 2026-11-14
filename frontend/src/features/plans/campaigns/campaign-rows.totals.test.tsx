import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import {
  budgetAndCost,
  campaign,
  initiative,
  planCampaigns,
  usd,
} from '@/testing/fixtures/campaigns';
import { nth } from '@/testing/dom';
import {
  DATA,
  FORMATTERS,
  renderRows,
  RIMULA,
  rowOf,
  rowOptions,
} from '@/testing/fixtures/campaign-rows';
import { totalsFooter } from './totals-footer';

describe('campaignRows: money and totals (feature 005, FR-022; 016 FR-013)', () => {
  it('shows the plan currency with the reader’s display currency beneath (016 FR-013, D-220)', () => {
    const euros = (amount: string) => ({ amount, currency: 'EUR' });
    const noGoals = { inq: null, mql: null, revenue: null };
    const helix = campaign({
      budget: usd('400000.00'),
      budgetAndCost: budgetAndCost({
        allocatedToChildren: usd('300000.00'),
        remainingForChildren: usd('100000.00'),
        plannedCost: usd('50000.00'),
        budgetUsedPercent: 13,
      }),
      display: {
        budget: euros('368000.00'),
        parentRemainingBudget: euros('184000.00'),
        budgetAndCost: budgetAndCost({
          allocatedToChildren: euros('276000.00'),
          remainingForChildren: euros('92000.00'),
          plannedCost: euros('46000.00'),
          budgetUsedPercent: 13,
        }),
        goals: noGoals,
      },
      initiatives: [
        initiative({
          budget: usd('300000.00'),
          display: {
            budget: euros('276000.00'),
            parentRemainingBudget: euros('92000.00'),
            budgetAndCost: budgetAndCost({ plannedCost: euros('46000.00') }),
            goals: noGoals,
          },
        }),
      ],
    });
    const tree = renderRows(
      planCampaigns(
        [helix],
        { allocatedToCampaigns: usd('400000.00'), plannedCost: usd('50000.00') },
        { allocatedToCampaigns: euros('368000.00'), plannedCost: euros('46000.00') },
      ),
      rowOptions(vi.fn()),
    );

    const row = rowOf(tree, 'Helix launch');
    // Each currency in its own symbol form (design system §4.4, D-413).
    expect(row).toHaveTextContent('$400,000.00≈ about €368,000.00');
    expect(row).toHaveTextContent('Remaining $100,000.00');
    expect(row).toHaveTextContent('$50,000.00≈ about €46,000.00');
    expect(rowOf(tree, 'Digital & social')).toHaveTextContent('$300,000.00≈ about €276,000.00');
    const totals = nth(within(tree).getAllByRole('row'), -1);
    expect(totals).toHaveTextContent('$400,000.00≈ about €368,000.00');
  });

  it('sums the plan in the totals row, with singular forms (FR-022)', () => {
    const tree = renderRows(DATA, rowOptions(vi.fn()));
    const totals = nth(within(tree).getAllByRole('row'), -1);

    // "Total" and its counts on two short lines, never wrapping (UI audit PL-05).
    expect(within(totals).getByText('Total')).toBeInTheDocument();
    expect(
      within(totals).getByText('3 campaigns · 2 initiatives · 1 activity'),
    ).toBeInTheDocument();
    expect(within(totals).getByText('$320,000.00')).toBeInTheDocument();
    expect(within(totals).getByText('Allocated')).toBeInTheDocument();
    expect(within(totals).getByText('$150,000.00')).toBeInTheDocument();

    const one = totalsFooter(
      planCampaigns([RIMULA], { campaigns: 1, initiatives: 1, activities: 0, plannedCost: null }),
      FORMATTERS,
    );
    renderWithProviders(<div data-testid="one">{one.name}</div>);
    expect(screen.getByTestId('one')).toHaveTextContent(
      'Total 1 campaign · 1 initiative · 0 activities',
    );
    expect(one.plannedCost).toBe('—');
  });
});
