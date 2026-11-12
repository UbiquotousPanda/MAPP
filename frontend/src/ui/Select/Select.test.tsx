import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { choose } from '@/testing/select';
import { Select } from './Select';

const OPTIONS = [
  { value: '', label: 'All' },
  { value: 'waiting', label: 'Waiting' },
];

describe('Select', () => {
  it('is named by its label, shows the choice, and answers "" for an option whose value is ""', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select label="Status" value="waiting" options={OPTIONS} onChange={onChange} />);
    const status = screen.getByRole('combobox', { name: 'Status' });
    expect(status).toHaveTextContent('Waiting');

    await choose(user, status, 'All');

    expect(onChange).toHaveBeenCalledWith('');
    await expectNoAxeViolations();
  });
});
