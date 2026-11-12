import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { plan } from '@/testing/fixtures/plans';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { DEFAULT_FILTERS } from './list-preferences';
import { chipReset, filterChips } from './plan-list-chips';
import { PlanHeader } from './PlanHeader';
import { PlansFilters } from './PlansFilters';

describe('013 FR-003: the BCPIR plans filter of the Plans list', () => {
  it('shows a chip while it is in use, and its removal includes every plan again', () => {
    expect(filterChips({ ...DEFAULT_FILTERS, bcpir: 'only' })).toContainEqual({
      key: 'bcpir',
      label: 'BCPIR plans: Only',
    });
    expect(filterChips(DEFAULT_FILTERS)).toEqual([]);
    expect(chipReset('bcpir')).toEqual({ bcpir: 'include' });
  });

  it('offers All plans, Only BCPIR plans and No BCPIR plans', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <PlansFilters filters={DEFAULT_FILTERS} years={[2026]} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'BCPIR plans' }));
    const menu = await screen.findByRole('dialog', { name: 'BCPIR plans' });
    expect(within(menu).getByRole('radio', { name: 'All plans' })).toBeChecked();
    await user.click(within(menu).getByRole('radio', { name: 'Only BCPIR plans' }));

    expect(onChange).toHaveBeenCalledWith({ bcpir: 'only' });
  });
});

describe('013 FR-002, FR-014: the plan header', () => {
  it('marks a BCPIR plan and leads to its SP&A view from More', async () => {
    const { router, user } = renderWithProviders(
      <PlanHeader plan={plan({ bcpir: true })} moreItems={[]} />,
      { user: testUser() },
    );

    expect(screen.getByRole('group', { name: 'Plan facts' })).toHaveTextContent('BCPIR');
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(await screen.findByRole('menuitem', { name: 'SP&A view' }));
    expect(router.state.location.pathname).toBe('/plans/P-1001/spa');
  });

  it('shows no marker on another plan', () => {
    renderWithProviders(<PlanHeader plan={plan({ bcpir: false })} moreItems={[]} />, {
      user: testUser(),
    });

    expect(screen.getByRole('group', { name: 'Plan facts' })).not.toHaveTextContent('BCPIR');
  });
});
