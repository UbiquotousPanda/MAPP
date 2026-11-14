import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { ViewSwitch } from './ViewSwitch';
import type { ViewChoice } from './ViewSwitch';

function Example() {
  const [view, setView] = useState<ViewChoice>('chart');
  return (
    <>
      <ViewSwitch label="Show Spend as" value={view} onChange={setView} />
      <p>Showing {view}</p>
    </>
  );
}

describe('ViewSwitch', () => {
  it('is a named group of Chart and Table, the chosen one pressed, and switches on click', async () => {
    const { user } = renderWithProviders(<Example />);
    const group = screen.getByRole('group', { name: 'Show Spend as' });

    expect(within(group).getByRole('button', { name: 'Chart' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(group).getByRole('button', { name: 'Table' }));

    expect(screen.getByText('Showing table')).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Table' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('names the icon in a tooltip on keyboard focus and passes axe', async () => {
    const { user } = renderWithProviders(<Example />);

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Chart');
    await expectNoAxeViolations();
  });
});
