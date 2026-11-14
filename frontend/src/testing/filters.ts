import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Folds out the filter menus behind **Filters (n)** (ui/FilterBar), unless they are out already. */
export async function openFilters(user: UserEvent): Promise<void> {
  const button = screen.queryByRole('button', { name: /^Filters/, expanded: false });
  if (button) {
    await user.click(button);
  }
}
