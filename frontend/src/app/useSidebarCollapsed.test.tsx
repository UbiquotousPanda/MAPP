import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { testUser } from '@/testing/fixtures/users';
import { Sidebar } from './Sidebar';

function narrowWindow() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(max-width: 1279px)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the sidebar below 1280 px', () => {
  it('starts as the icon rail although the person keeps it expanded, and expands for this session without saving (FR-011)', async () => {
    narrowWindow();
    const api = mockApi([]);
    const { user } = renderWithProviders(<Sidebar />, { user: testUser() });

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));

    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();
    expect(api.requests).toHaveLength(0);
  });
});
