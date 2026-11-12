import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { SearchField } from './SearchField';

function Example() {
  const [value, setValue] = useState('');
  return (
    <SearchField
      label="Search models"
      placeholder="Search name"
      value={value}
      onChange={setValue}
    />
  );
}

describe('SearchField', () => {
  it('is a named search box that says what it searches (design system §6.1)', () => {
    renderWithProviders(<Example />);

    const box = screen.getByRole('searchbox', { name: 'Search models' });
    expect(box).toHaveAttribute('placeholder', 'Search name');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('offers Clear search once something is typed, and keeps the focus in the box', async () => {
    const { user } = renderWithProviders(<Example />);
    const box = screen.getByRole('searchbox', { name: 'Search models' });

    await user.type(box, 'Lubri');
    expect(box).toHaveValue('Lubri');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(box).toHaveValue('');
    expect(box).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('with a delay, reports the text once typing pauses, not at every key', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <SearchField label="Search plans" value="" delay={50} onChange={onChange} />,
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search plans' }), 'Lub');

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('Lub'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('with a delay, reports the text at once when the box loses the focus', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <SearchField label="Search plans" value="" delay={60_000} onChange={onChange} />,
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search plans' }), 'Lub');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('Lub');
  });

  it('with a delay, shows a text set elsewhere (Clear filters, Back) over what was typed', async () => {
    const { user } = renderWithProviders(<SetElsewhere />);
    const box = screen.getByRole('searchbox', { name: 'Search plans' });
    await user.type(box, 'Lub');

    await user.click(screen.getByRole('button', { name: 'Set elsewhere' }));

    expect(box).toHaveValue('Mobility');
  });
});

function SetElsewhere() {
  const [value, setValue] = useState('');
  return (
    <>
      <SearchField label="Search plans" value={value} delay={60_000} onChange={setValue} />
      <button type="button" onClick={() => setValue('Mobility')}>
        Set elsewhere
      </button>
    </>
  );
}
