import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Outlet } from 'react-router';
import { SessionProvider } from '@/session/SessionProvider';
import { renderRoutes, renderWithProviders } from '@/testing/render';
import type { CurrentUser } from '@/session/useSession';
import { testUser } from '@/testing/fixtures/users';
import { AppLayout } from './AppLayout';

const PRIYA: CurrentUser = testUser();

function renderLayout(user: CurrentUser = PRIYA) {
  return renderWithProviders(
    <AppLayout>
      <h1>A page</h1>
    </AppLayout>,
    { user },
  );
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('AppLayout', () => {
  it('starts with "Skip to main content", the first thing the keyboard reaches (SC-006)', async () => {
    const { user } = renderLayout();

    await user.tab();

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main');
  });

  it('puts the page in the main region that the skip link leads to (FR-010)', () => {
    renderLayout();

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(main).toContainElement(screen.getByRole('heading', { name: 'A page' }));
  });

  it('shows the demo banner and the footer (FR-016, design system §2)', () => {
    renderLayout();

    expect(
      screen.getByText('Demo environment — sign-in and data are for demonstration only'),
    ).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© SP&A One — demo data');
  });

  it('shows the sidebar, and the menu button that narrow screens use instead (FR-010, FR-011)', () => {
    renderLayout();

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('widens the content column only for a page whose route asks for it (039 contracts/ui.md)', () => {
    const pageOf = (wide: boolean) => ({
      element: (
        <SessionProvider>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </SessionProvider>
      ),
      children: [{ path: '*', element: <h1>A page</h1>, handle: { title: 'A page', wide } }],
    });
    const column = () => screen.getByRole('heading', { name: 'A page' }).parentElement?.className;
    renderRoutes([pageOf(true)], { route: '/reports/approvals', user: PRIYA });
    expect(column()).toMatch(/contentWide/);

    cleanup();
    renderRoutes([pageOf(false)], { route: '/plans', user: PRIYA });

    expect(column()).not.toMatch(/contentWide/);
  });
});
