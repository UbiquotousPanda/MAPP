import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { expectNoAxeViolations } from '@/testing/axe';
import { StatusDot } from './StatusDot';

describe('StatusDot', () => {
  it('names its status to screen readers and in a tooltip on keyboard focus', async () => {
    const { user } = renderWithProviders(
      <StatusDot tone="problem" label="Overdue · Start date passed" />,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Overdue · Start date passed' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Overdue · Start date passed');
    await expectNoAxeViolations();
  });
});
