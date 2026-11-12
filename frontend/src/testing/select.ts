import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Opens a ui/Select and picks the option with this name. */
export async function choose(
  user: UserEvent,
  combobox: HTMLElement,
  option: string,
): Promise<void> {
  await user.click(combobox);
  await user.click(await screen.findByRole('option', { name: option }));
}
