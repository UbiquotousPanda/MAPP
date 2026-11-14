import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { DisclosureButton } from './DisclosureButton';

describe('DisclosureButton', () => {
  it('says whether the rows under it show and toggles them', async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <DisclosureButton expanded={false} label="Expand Spring" onClick={onClick} />,
    );

    const button = screen.getByRole('button', { name: 'Expand Spring' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.setup().click(button);
    expect(onClick).toHaveBeenCalledOnce();

    rerender(<DisclosureButton expanded label="Collapse Spring" onClick={onClick} />);
    expect(screen.getByRole('button', { name: 'Collapse Spring' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expectNoAxeViolations();
  });
});
