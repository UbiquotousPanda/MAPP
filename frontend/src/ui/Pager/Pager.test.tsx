import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { choose } from '@/testing/select';
import { Pager } from './Pager';

const SIZES = [10, 25, 50] as const;

function renderPager(page: number, total: number) {
  const onPage = vi.fn();
  const onPageSize = vi.fn();
  render(
    <Pager
      placement="below"
      page={page}
      pageSize={25}
      total={total}
      sizes={SIZES}
      onPage={onPage}
      onPageSize={onPageSize}
    />,
  );
  return { user: userEvent.setup(), onPage, onPageSize };
}

describe('Pager', () => {
  it('says which rows show and moves a page either way', async () => {
    const { user, onPage } = renderPager(2, 60);

    expect(screen.getByText('26–50 of 60')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onPage.mock.calls).toEqual([[1], [3]]);
    await expectNoAxeViolations();
  });

  it('goes to the last page when the page is past the end, as after an old link or deletes', () => {
    const { onPage } = renderPager(9, 60);

    expect(onPage).toHaveBeenCalledWith(3);
  });

  it('disables Next on the last page', () => {
    renderPager(3, 60);

    expect(screen.getByText('51–60 of 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });

  it('has no page buttons when everything fits on one page, and says "No rows" for none', () => {
    renderPager(1, 0);

    expect(screen.getByText('No rows')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
  });

  it('changes the rows per page to one of its sizes', async () => {
    const { user, onPageSize } = renderPager(1, 9);

    expect(screen.getByText('1–9 of 9')).toBeInTheDocument();
    await choose(user, screen.getByRole('combobox', { name: 'Rows per page' }), '50');

    expect(onPageSize).toHaveBeenCalledWith(50);
  });

  it('leaves out Rows per page when the page size is fixed', () => {
    render(<Pager placement="below" page={1} pageSize={25} total={60} onPage={vi.fn()} />);

    expect(screen.getByText('1–25 of 60')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Rows per page' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });
});
