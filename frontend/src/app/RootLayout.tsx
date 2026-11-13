import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { SessionProvider } from '@/session/SessionProvider';
import { PageLoading } from './PageLoading';
import { isToTop } from './to-top';

/** Scroll is kept per page, so a query change stays put; a `TO_TOP` link (the logo) opens at the top. */
export function RootLayout() {
  return (
    <SessionProvider>
      <ScrollRestoration
        getKey={(location) => (isToTop(location.state) ? location.key : location.pathname)}
      />
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </SessionProvider>
  );
}
