import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { ReadOnlyField } from './ReadOnlyField';

const REASON = "Year can't change once the plan is saved.";

describe('ReadOnlyField', () => {
  it('shows the label and value, and its lock opens the reason', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReadOnlyField label="Year" value="2026" lock={REASON} />);

    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "Why Year can't change" }));
    expect(screen.getByRole('dialog', { name: "Why Year can't change" })).toHaveTextContent(REASON);
    await expectNoAxeViolations(container);
  });

  it('has no lock without a reason', () => {
    render(<ReadOnlyField label="Year" value="2026" tip="The plan's calendar year." />);

    expect(screen.getByRole('button', { name: 'About Year' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /can't change/ })).not.toBeInTheDocument();
  });
});
