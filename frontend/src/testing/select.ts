import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Opens a ui/Select and picks the option with this name. */
export async function choose(
  user: UserEvent,
  combobox: HTMLElement,
  option: string | RegExp,
): Promise<void> {
  await user.click(combobox);
  await user.click(await screen.findByRole('option', { name: option }));
}

export async function optionNames(user: UserEvent, combobox: HTMLElement): Promise<string[]> {
  await user.click(combobox);
  const names = (await screen.findAllByRole('option')).map((option) => option.textContent);
  await user.keyboard('{Escape}');
  return names;
}
