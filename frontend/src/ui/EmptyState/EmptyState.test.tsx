import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('offers Reset filters when given onReset, and the button calls it', async () => {
    const onReset = vi.fn();
    render(<EmptyState title="Your filters exclude everything" onReset={onReset} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});
