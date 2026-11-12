import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { findMessages, renderWithProviders } from '@/testing/render';
import { HxKey } from './HxKey';

afterEach(() => vi.restoreAllMocks());

function renderKey(hint?: string) {
  mockApi([]);
  return renderWithProviders(<HxKey value="HX1006" hint={hint} />, { user: testUser() });
}

describe('030 FR-016, 032 FR-020: HX key', () => {
  it('shows the key read-only, says where it comes from and copies it', async () => {
    const { user } = renderKey('Generated from the line-item ID');

    expect(screen.getByText('HX1006')).toHaveAccessibleDescription(
      'Generated from the line-item ID',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy HX key HX1006' }));

    expect(await findMessages()).toHaveTextContent('HX key copied');
    expect(await navigator.clipboard.readText()).toBe('HX1006');
    await expectNoAxeViolations();
  });

  it('says how to copy it by hand when the browser refuses', async () => {
    const { user } = renderKey();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await user.click(screen.getByRole('button', { name: 'Copy HX key HX1006' }));

    expect(await findMessages()).toHaveTextContent(
      "Couldn't copy the HX key — select it and copy it yourself.",
    );
  });
});
