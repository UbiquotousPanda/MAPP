import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip as RadixTooltip } from 'radix-ui';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SummaryCard } from './SummaryCard';

function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <RadixTooltip.Provider delayDuration={0}>{children}</RadixTooltip.Provider>
    </MemoryRouter>
  );
}

describe('SummaryCard', () => {
  it('explains its label with an info tip (FR-019)', async () => {
    const user = userEvent.setup();
    render(
      <SummaryCard
        label="In the recycle bin"
        value={1}
        tip="Deleted items you can still bring back."
      />,
      { wrapper: TooltipProvider },
    );

    await user.click(screen.getByRole('button', { name: 'About In the recycle bin' }));

    expect(screen.getByRole('dialog', { name: 'About In the recycle bin' })).toHaveTextContent(
      'Deleted items you can still bring back.',
    );
  });

  it('lets keyboard and screen-reader users reach the full value of a shortened one (FR-019, FR-021)', async () => {
    const user = userEvent.setup();
    render(<SummaryCard label="Planned budget" value="$1.25M" fullValue="$1,250,000.00" />, {
      wrapper: TooltipProvider,
    });

    // The name starts with the visible text (WCAG 2.5.3) and adds the full value.
    const value = screen.getByRole('button', { name: '$1.25M ($1,250,000.00)' });
    expect(value).toHaveTextContent('$1.25M');

    await user.tab();

    expect(value).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('$1,250,000.00');
  });

  it('shows a value that is already complete as plain text (FR-019)', () => {
    render(<SummaryCard label="Planned budget" value="$950.00" fullValue="$950.00" />, {
      wrapper: TooltipProvider,
    });

    expect(screen.getByText('$950.00')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens its list as one link named by label, full value and destination, the tips still reachable', async () => {
    const user = userEvent.setup();
    render(
      <SummaryCard
        label="Planned cost"
        value="$1.25M"
        fullValue="$1,250,000.00"
        tip="The planned cost of every activity."
        to="/plans"
        linkLabel="open the Plans list"
      />,
      { wrapper: TooltipProvider },
    );

    expect(
      screen.getByRole('link', {
        name: 'Planned cost: $1.25M ($1,250,000.00) — open the Plans list',
      }),
    ).toHaveAttribute('href', '/plans');
    await user.click(screen.getByRole('button', { name: 'About Planned cost' }));
    expect(screen.getByRole('dialog', { name: 'About Planned cost' })).toBeInTheDocument();
  });
});
