import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { choose } from '@/testing/select';
import { AccessTable } from './AccessTable';
import { userAccessReport } from './user-access-fixture';

function renderTable(total = 3) {
  const onChange = vi.fn();
  const rendered = renderWithProviders(
    <AccessTable
      rows={userAccessReport().rows}
      total={total}
      table={{ q: '', teams: [], status: 'active', sort: 'name', page: 1, pageSize: 50 }}
      onChange={onChange}
    />,
    { route: '/reports/plan-data?tab=people', user: testUser(), path: '/reports/plan-data' },
  );
  return { onChange, ...rendered };
}

describe('AccessTable (045 FR-006)', () => {
  it('turns the sorted column round, and sorts last sign-in latest first', async () => {
    const { user, onChange } = renderTable();

    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onChange).toHaveBeenLastCalledWith({ sort: '-name' });
    await user.click(screen.getByRole('button', { name: 'Last sign-in' }));
    expect(onChange).toHaveBeenLastCalledWith({ sort: '-lastSignedIn' });
  });

  it('pages 25 to 200 rows, opening at 50 (D-432)', async () => {
    const { user, onChange } = renderTable(120);

    expect(screen.getByText('1–50 of 120')).toBeInTheDocument();
    await choose(user, screen.getByRole('combobox', { name: 'Rows per page' }), '200');
    expect(onChange).toHaveBeenLastCalledWith({ pageSize: 200 });
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onChange).toHaveBeenLastCalledWith({ page: 2 });
  });
});
